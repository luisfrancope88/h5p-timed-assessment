H5P.TimedAssessment = (function () {

  function TimedAssessment(params, contentId) {
    this.params = params || {};
    this.contentId = contentId;

    this.questions = this.params.questions || [];
    this.currentQuestion = 0;
    this.timer = null;
    this.timeRemaining = 0;
    this.questionRevealed = false;
    this.responses = [];
    this.score = 0;
    this.completed = false;
  }

  TimedAssessment.prototype.attach = function ($container) {
  var self = this;

  this.$container = $container;

  this.$container.empty();
  this.$container.addClass('timed-assessment');

  this.render();

  // Recalculate the H5P container when its dimensions change,
  // for example when accessibility text size is increased.
  if (window.ResizeObserver) {
    this.resizeObserver = new ResizeObserver(function () {
      self.trigger('resize');
    });

    this.resizeObserver.observe(this.$container.get(0));
  }

  // Additional resize after initial rendering.
  window.setTimeout(function () {
    self.trigger('resize');
  }, 100);
  };

  TimedAssessment.prototype.render = function () {
    var self = this;

    this.stopTimer();
    this.$container.empty();

    var title = this.params.assessmentTitle || 'Timed Assessment';

    var $assessment = H5P.jQuery('<div>', {
      class: 'timed-assessment-container'
    });

    $assessment.append(
      H5P.jQuery('<h2>', {
        class: 'timed-assessment-title',
        text: title
      })
    );

    if (this.questions.length === 0) {
      $assessment.append(
        H5P.jQuery('<p>', {
          text: 'No questions have been added.'
        })
      );

      this.$container.append($assessment);
      this.trigger('resize');
      return;
    }

    var question = this.questions[this.currentQuestion];

    $assessment.append(
      H5P.jQuery('<div>', {
        class: 'timed-assessment-progress',
        text:
          'Question ' +
          (this.currentQuestion + 1) +
          ' of ' +
          this.questions.length
      })
    );

    var $questionCard = H5P.jQuery('<div>', {
      class: 'timed-assessment-question-card'
    });

    if (!this.questionRevealed) {
      var $blurredPreview = H5P.jQuery('<div>', {
        class: 'timed-assessment-blurred-preview',
        'aria-hidden': 'true'
      });

      $blurredPreview.append(
        H5P.jQuery('<p>', {
          class: 'timed-assessment-question-text',
          text: self.decodeHTML(question.questionText || '')
        })
      );

      var $blurredAnswers = H5P.jQuery('<div>', {
        class: 'timed-assessment-blurred-answers'
      });

      $blurredAnswers.append(
        H5P.jQuery('<div>', {
          class: 'timed-assessment-blurred-answer'
        }),
        H5P.jQuery('<div>', {
          class: 'timed-assessment-blurred-answer'
        }),
        H5P.jQuery('<div>', {
          class: 'timed-assessment-blurred-answer'
        })
      );

      $blurredPreview.append($blurredAnswers);
      $questionCard.append($blurredPreview);
      
      var $locked = H5P.jQuery('<div>', {
        class: 'timed-assessment-locked'
      });



      $locked.append(
        H5P.jQuery('<div>', {
          class: 'timed-assessment-lock',
          text: '🔒'
        })
      );

      $locked.append(
        H5P.jQuery('<p>', {
          text: 'The question is hidden.'
        })
      );

      var $revealButton = H5P.jQuery('<button>', {
        type: 'button',
        class: 'timed-assessment-reveal',
        text: 'Reveal question'
      });

      $revealButton.on('click', function () {
        self.revealQuestion();
      });

      $locked.append($revealButton);
      $questionCard.append($locked);
    }
    else {
      this.renderQuestion(question, $questionCard);
    }

    $assessment.append($questionCard);
    this.$container.append($assessment);
  };

  TimedAssessment.prototype.revealQuestion = function () {
    var question = this.questions[this.currentQuestion];

    this.questionRevealed = true;
    this.timeRemaining = Number(question.timeLimit) || 60;

    this.render();
    this.startTimer();
  };

  TimedAssessment.prototype.renderQuestion = function (question, $questionCard) {
    var self = this;

    var $header = H5P.jQuery('<div>', {
      class: 'timed-assessment-question-header'
    });

    $header.append(
      H5P.jQuery('<strong>', {
        text: 'Question ' + (this.currentQuestion + 1)
      })
    );

    this.$timerDisplay = H5P.jQuery('<span>', {
      class: 'timed-assessment-timer',
      text: this.formatTime(this.timeRemaining)
    });

    $header.append(this.$timerDisplay);
    $questionCard.append($header);

    $questionCard.append(
      H5P.jQuery('<p>', {
        class: 'timed-assessment-question-text',
        text: self.decodeHTML(question.questionText)
      })
    );

    var $answerArea = H5P.jQuery('<div>', {
      class: 'timed-assessment-answer-area'
    });

    this.renderQuestionInput(
      question,
      this.currentQuestion,
      $answerArea
    );

    $questionCard.append($answerArea);

    var $navigation = H5P.jQuery('<div>', {
      class: 'timed-assessment-navigation'
    });

    var isLastQuestion =
      this.currentQuestion === this.questions.length - 1;

    var $nextButton = H5P.jQuery('<button>', {
      type: 'button',
      class: 'timed-assessment-next',
      text: isLastQuestion ? 'Finish' : 'Next question'
    });

    $nextButton.on('click', function () {
      self.completeCurrentQuestion();
    });

    $navigation.append($nextButton);
    $questionCard.append($navigation);
  };

  TimedAssessment.prototype.renderQuestionInput = function (
    question,
    questionIndex,
    $answerArea
  ) {
    var type = question.questionType || 'singleChoice';

    if (type === 'singleChoice' || type === 'multipleChoice') {
      this.renderChoiceQuestion(
        question,
        questionIndex,
        type,
        $answerArea
      );
      return;
    }

    if (type === 'trueFalse') {
      this.renderTrueFalseQuestion(questionIndex, $answerArea);
      return;
    }

    if (type === 'freeText') {
      this.renderFreeTextQuestion(questionIndex, $answerArea);
    }
  };

  TimedAssessment.prototype.renderChoiceQuestion = function (
    question,
    questionIndex,
    type,
    $answerArea
  ) {
    var self = this;
    var answers = question.answers || [];
    var inputType = type === 'multipleChoice' ? 'checkbox' : 'radio';
    var inputName = 'timed-assessment-question-' + questionIndex;

    answers.forEach(function (answer, answerIndex) {
      var $label = H5P.jQuery('<label>', {
        class: 'timed-assessment-option'
      });

      $label.append(
        H5P.jQuery('<input>', {
          type: inputType,
          name: inputName,
          value: answerIndex
        })
      );

      $label.append(
        H5P.jQuery('<span>', {
          text: self.decodeHTML(answer.answerText)
        })
      );

      $answerArea.append($label);
    });
  };

  TimedAssessment.prototype.renderTrueFalseQuestion = function (
    questionIndex,
    $answerArea
  ) {
    var inputName = 'timed-assessment-question-' + questionIndex;

    [
      { value: 'true', label: 'True' },
      { value: 'false', label: 'False' }
    ].forEach(function (option) {
      var $label = H5P.jQuery('<label>', {
        class: 'timed-assessment-option'
      });

      $label.append(
        H5P.jQuery('<input>', {
          type: 'radio',
          name: inputName,
          value: option.value
        })
      );

      $label.append(
        H5P.jQuery('<span>', {
          text: option.label
        })
      );

      $answerArea.append($label);
    });
  };

  TimedAssessment.prototype.renderFreeTextQuestion = function (
    questionIndex,
    $answerArea
  ) {
    $answerArea.append(
      H5P.jQuery('<textarea>', {
        class: 'timed-assessment-free-text',
        name: 'timed-assessment-question-' + questionIndex,
        rows: 5,
        placeholder: 'Write your answer here...'
      })
    );
  };

  TimedAssessment.prototype.startTimer = function () {
    var self = this;

    this.stopTimer();

    this.timer = window.setInterval(function () {
      self.timeRemaining -= 1;

      if (self.$timerDisplay) {
        self.$timerDisplay.text(
          self.formatTime(self.timeRemaining)
        );

      if (self.timeRemaining <= 10 && self.timeRemaining > 0) {
        self.$timerDisplay.addClass('timed-assessment-timer-warning');
      }
      else {
        self.$timerDisplay.removeClass('timed-assessment-timer-warning');
      }
      }

      if (self.timeRemaining <= 0) {
        self.timeRemaining = 0;
        self.stopTimer();
        self.timeExpired();
      }
    }, 1000);
  };

  TimedAssessment.prototype.stopTimer = function () {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  };

  TimedAssessment.prototype.timeExpired = function () {
    this.saveCurrentResponse(true);
    this.disableCurrentQuestion();

    if (this.$timerDisplay) {
    this.$timerDisplay.text('00:00');
    }
  };

  TimedAssessment.prototype.disableCurrentQuestion = function () {
    this.$container
      .find('input, textarea')
      .prop('disabled', true);
  };
  
  TimedAssessment.prototype.saveCurrentResponse = function (timedOut) {
  var question = this.questions[this.currentQuestion];
  var type = question.questionType || 'singleChoice';
  var response = null;
  var correct = false;

  if (type === 'singleChoice') {
    var selected = this.$container
      .find('input[type="radio"]:checked')
      .val();

    if (selected !== undefined) {
      response = Number(selected);

      var selectedAnswer = question.answers &&
        question.answers[response];

      correct = Boolean(
        selectedAnswer && selectedAnswer.correct
      );
    }
  }

  else if (type === 'multipleChoice') {
    response = [];

    this.$container
      .find('input[type="checkbox"]:checked')
      .each(function () {
        response.push(Number(H5P.jQuery(this).val()));
      });

    var correctIndexes = [];

    (question.answers || []).forEach(function (answer, index) {
      if (answer.correct) {
        correctIndexes.push(index);
      }
    });

    correct =
      response.length === correctIndexes.length &&
      response.every(function (value) {
        return correctIndexes.indexOf(value) !== -1;
      });
  }

  else if (type === 'trueFalse') {
    response = this.$container
      .find('input[type="radio"]:checked')
      .val();

    correct =
      response !== undefined &&
      response === question.trueFalseAnswer;
  }

  else if (type === 'freeText') {
    response = this.$container
      .find('.timed-assessment-free-text')
      .val() || '';

    var given = response
      .trim()
      .toLowerCase();

    var acceptedAnswers = question.acceptedAnswers || [];

    correct = acceptedAnswers.some(function (item) {
      var accepted = typeof item === 'string'
        ? item
        : (item.acceptedAnswer || '');

      accepted = accepted.trim().toLowerCase();

      return accepted !== '' && given === accepted;
    });
  }

  this.responses[this.currentQuestion] = {
    response: response,
    correct: correct,
    timedOut: Boolean(timedOut)
  };

  this.recalculateScore();

  this.triggerAnswered(
  this.currentQuestion,
  this.responses[this.currentQuestion]
  );  
  };

  TimedAssessment.prototype.recalculateScore = function () {
  this.score = this.responses.reduce(function (total, result) {
    return total + (result && result.correct ? 1 : 0);
  }, 0);
  };

  TimedAssessment.prototype.recalculateScore = function () {
  this.score = this.responses.reduce(function (total, result) {
    return total + (result && result.correct ? 1 : 0);
  }, 0);
  };


  // NUEVO: enviar evento xAPI "answered"
  TimedAssessment.prototype.triggerAnswered = function (
    questionIndex,
    result
  ) {
    if (!result) {
      return;
    }

    var question = this.questions[questionIndex];
    var responseText = this.getResponseText(question, result);

    var event = this.createXAPIEventTemplate('answered');

    event.setScoredResult(
      result.correct ? 1 : 0,
      1,
      this,
      true,
      result.correct
    );

    event.data.statement.result.response =
      responseText === 'No answer' ? '' : responseText;

    this.trigger(event);
  };


  TimedAssessment.prototype.completeCurrentQuestion = function () {
    this.stopTimer();

    if (!this.responses[this.currentQuestion]) {
    this.saveCurrentResponse(false);
    }

    if (this.currentQuestion < this.questions.length - 1) {
    this.currentQuestion += 1;
    this.questionRevealed = false;
    this.timeRemaining = 0;
    this.render();
    return;
    }

    this.renderFinished();
  };


  TimedAssessment.prototype.decodeHTML = function (text) {
  if (text === null || text === undefined) {
    return '';
  }

  var textarea = document.createElement('textarea');
  textarea.innerHTML = String(text);

  return textarea.value;
  };

  TimedAssessment.prototype.getResponseText = function (question, result) {

    var self =this;

    if (!result || result.response === null || result.response === undefined) {
      return 'No answer';
    }

    var type = question.questionType || 'singleChoice';

    if (type === 'singleChoice') {
      var answer = (question.answers || [])[result.response];
      return answer
        ? this.decodeHTML(answer.answerText)
        : 'No answer';
    }

    if (type === 'multipleChoice') {
      if (!Array.isArray(result.response) || result.response.length === 0) {
        return 'No answer';
      }

      return result.response
        .map(function (index) {
          var answer = (question.answers || [])[index];
          return answer ? self.decodeHTML(answer.answerText) : '';
        })
        .filter(Boolean)
        .join(', ');
    }

    if (type === 'trueFalse') {
      return result.response === 'true' ? 'True' : 'False';
    }

    if (type === 'freeText') {
      return result.response.trim() || 'No answer';
    }

    return 'No answer';
  };


  TimedAssessment.prototype.getCorrectAnswerText = function (question) {
    var self = this;
    var type = question.questionType || 'singleChoice';

    if (type === 'singleChoice' || type === 'multipleChoice') {
      return (question.answers || [])
        .filter(function (answer) {
          return answer.correct;
        })
        .map(function (answer) {
          return self.decodeHTML(answer.answerText);
        })
        .join(', ') || 'Not specified';
    }

    if (type === 'trueFalse') {
      return question.trueFalseAnswer === 'true' ? 'True' : 'False';
    }

    if (type === 'freeText') {
      var acceptedAnswers = question.acceptedAnswers || [];

      if (acceptedAnswers.length === 0) {
        return 'Not specified';
      }

      return acceptedAnswers
        .map(function (item) {
          var answer = typeof item === 'string'
            ? item
            : (item.acceptedAnswer || '');

          return self.decodeHTML(answer);
        })
        .filter(Boolean)
        .join(', ');
    }

    return 'Not specified';
  };
  
  TimedAssessment.prototype.getScore = function () {
      return this.score || 0;
  };

  TimedAssessment.prototype.getMaxScore = function () {
      return this.questions.length;
  };

  TimedAssessment.prototype.getAnswerGiven = function () {
      return this.responses.some(function (result) {
        if (!result) {
          return false;
        }

        if (Array.isArray(result.response)) {
          return result.response.length > 0;
        }

        return result.response !== null &&
          result.response !== undefined &&
          result.response !== '';
      });
  };

  TimedAssessment.prototype.isPassed = function () {
      return this.getScore() >= this.getMaxScore() * 0.5;
  };
  
  TimedAssessment.prototype.getXAPIData = function () {
    return {
      statement: this.getXAPIResult()
    };
  };

  TimedAssessment.prototype.getXAPIResult = function () {
  var score = this.getScore();
  var maxScore = this.getMaxScore();

   return {
      result: {
        score: {
          raw: score,
          min: 0,
          max: maxScore,
          scaled: maxScore > 0 ? score / maxScore : 0
        },
        success: this.isPassed(),
        completion: true
      }
   };
  };


  TimedAssessment.prototype.triggerCompleted = function () {
    if (this.completed) {
      return;
    }

    this.completed = true;

    var score = this.getScore();
    var maxScore = this.getMaxScore();

    // Resultado puntuado del examen
    this.triggerXAPIScored(
      score,
      maxScore,
      'completed',
      true,
      this.isPassed()
    );

    // Estado explícito Passed / Failed
    this.triggerXAPIScored(
      score,
      maxScore,
      this.isPassed() ? 'passed' : 'failed',
      true,
      this.isPassed()
    );
  };


  TimedAssessment.prototype.renderFinished = function () {
    var self = this;

    this.stopTimer();
    this.triggerCompleted();
    this.$container.empty();

    var $finished = H5P.jQuery('<div>', {
      class: 'timed-assessment-finished'
    });

    $finished.append(
      H5P.jQuery('<h2>', {
        text: this.params.assessmentTitle || 'Timed Assessment'
      })
    );

    $finished.append(
      H5P.jQuery('<p>', {
        class: 'timed-assessment-completed',
        text: 'Assessment completed.'
      })
    );

    // H5P standard score bar
      var $score = H5P.jQuery('<div>', {
        class: 'timed-assessment-score'
      });

      if (H5P.JoubelUI && H5P.JoubelUI.createScoreBar) {
        var scoreBar = H5P.JoubelUI.createScoreBar(
          this.getMaxScore()
        );

        scoreBar.setScore(
          this.getScore()
        );

        scoreBar.appendTo($score);
      }
      else {
        // Fallback if JoubelUI is unavailable
        $score.append(
          H5P.jQuery('<strong>', {
            text:
              'Score: ' +
              this.getScore() +
              ' / ' +
              this.getMaxScore()
          })
        );
      }

      $finished.append($score);

    // Results for each question
    var $results = H5P.jQuery('<div>', {
      class: 'timed-assessment-results'
    });

    this.questions.forEach(function (question, index) {
      var result = self.responses[index];

      var $result = H5P.jQuery('<div>', {
        class: 'timed-assessment-result'
      });

      var $resultHeader = H5P.jQuery('<div>', {
        class: 'timed-assessment-result-header'
      });

      $resultHeader.append(
        H5P.jQuery('<strong>', {
          text: 'Question ' + (index + 1)
        })
      );

      var statusText = 'No answer';

      if (result) {
        statusText = result.correct ? 'Correct' : 'Incorrect';

        if (result.timedOut) {
          statusText += ' — Time expired';
        }
      }

      $resultHeader.append(
        H5P.jQuery('<span>', {
          class:
            'timed-assessment-result-status ' +
            (result && result.correct
              ? 'timed-assessment-result-correct'
              : 'timed-assessment-result-incorrect'),
          text: statusText
        })
      );

      $result.append($resultHeader);

      $result.append(
        H5P.jQuery('<p>', {
          class: 'timed-assessment-result-question',
          text: self.decodeHTML(question.questionText || '')
        })
      );

      var responseText = self.getResponseText(question, result);
      var correctAnswerText = self.getCorrectAnswerText(question);
      
      var $details = H5P.jQuery('<div>', {
        class: 'timed-assessment-result-details'
      });

      $details.append(
        H5P.jQuery('<p>').append(
          H5P.jQuery('<strong>', {
            text: 'Your answer: '
          }),
          document.createTextNode(responseText)
        )
      );

      $details.append(
        H5P.jQuery('<p>').append(
          H5P.jQuery('<strong>', {
            text: 'Correct answer: '
          }),
          document.createTextNode(correctAnswerText)
        )
      );

      $result.append($details);

      $results.append($result);
    });

    $finished.append($results);

    this.$container.append($finished);
    this.trigger('resize');
  };

  TimedAssessment.prototype.formatTime = function (seconds) {
    seconds = Math.max(0, Number(seconds) || 0);

    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;

    return (
      String(minutes).padStart(2, '0') +
      ':' +
      String(remainingSeconds).padStart(2, '0')
    );
  };

  return TimedAssessment;

})();