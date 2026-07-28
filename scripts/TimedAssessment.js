H5P.TimedAssessment = (function () {

  function TimedAssessment(params, contentId) {
    this.params = params || {};
    this.contentId = contentId;
  }

  TimedAssessment.prototype.attach = function ($container) {
    var self = this;

    $container.empty();
    $container.addClass('timed-assessment');

    var title = self.params.assessmentTitle || 'Timed Assessment';
    var questions = self.params.questions || [];

    var $assessment = H5P.jQuery('<div>', {
      class: 'timed-assessment-container'
    });

    var $title = H5P.jQuery('<h2>', {
      class: 'timed-assessment-title',
      text: title
    });

    $assessment.append($title);

    if (questions.length === 0) {
      $assessment.append(
        H5P.jQuery('<p>', {
          text: 'No questions have been added.'
        })
      );

      $container.append($assessment);
      return;
    }

    questions.forEach(function (question, index) {
      var $question = H5P.jQuery('<div>', {
        class: 'timed-assessment-question'
      });

      $question.append(
        H5P.jQuery('<h3>', {
          text: 'Question ' + (index + 1)
        })
      );

      $question.append(
        H5P.jQuery('<p>', {
          class: 'timed-assessment-question-text',
          text: question.questionText || ''
        })
      );

      $question.append(
        H5P.jQuery('<div>', {
          class: 'timed-assessment-time',
          text: 'Time: ' + (question.timeLimit || 60) + ' seconds'
        })
      );

      var $answerArea = H5P.jQuery('<div>', {
        class: 'timed-assessment-answer-area'
      });

      renderQuestionInput(question, index, $answerArea);

      $question.append($answerArea);
      $assessment.append($question);
    });

    $container.append($assessment);
  };

  function renderQuestionInput(question, questionIndex, $answerArea) {
    var type = question.questionType || 'singleChoice';

    if (type === 'singleChoice' || type === 'multipleChoice') {
      renderChoiceQuestion(question, questionIndex, type, $answerArea);
      return;
    }

    if (type === 'trueFalse') {
      renderTrueFalseQuestion(questionIndex, $answerArea);
      return;
    }

    if (type === 'freeText') {
      renderFreeTextQuestion(questionIndex, $answerArea);
    }
  }

  function renderChoiceQuestion(question, questionIndex, type, $answerArea) {
    var answers = question.answers || [];
    var inputType = type === 'multipleChoice' ? 'checkbox' : 'radio';
    var inputName = 'timed-assessment-question-' + questionIndex;

    answers.forEach(function (answer, answerIndex) {
      var $label = H5P.jQuery('<label>', {
        class: 'timed-assessment-option'
      });

      var $input = H5P.jQuery('<input>', {
        type: inputType,
        name: inputName,
        value: answerIndex
      });

      $label.append($input);
      $label.append(
        H5P.jQuery('<span>', {
          text: answer.answerText || ''
        })
      );

      $answerArea.append($label);
    });
  }

  function renderTrueFalseQuestion(questionIndex, $answerArea) {
    var inputName = 'timed-assessment-question-' + questionIndex;

    ['True', 'False'].forEach(function (label, index) {
      var $label = H5P.jQuery('<label>', {
        class: 'timed-assessment-option'
      });

      $label.append(
        H5P.jQuery('<input>', {
          type: 'radio',
          name: inputName,
          value: index === 0 ? 'true' : 'false'
        })
      );

      $label.append(
        H5P.jQuery('<span>', {
          text: label
        })
      );

      $answerArea.append($label);
    });
  }

  function renderFreeTextQuestion(questionIndex, $answerArea) {
    $answerArea.append(
      H5P.jQuery('<textarea>', {
        class: 'timed-assessment-free-text',
        name: 'timed-assessment-question-' + questionIndex,
        rows: 4,
        placeholder: 'Write your answer here...'
      })
    );
  }

  return TimedAssessment;

})();