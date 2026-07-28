H5P.TimedAssessment = (function () {

  function TimedAssessment(params, contentId) {
    this.params = params || {};
    this.contentId = contentId;
  }

  TimedAssessment.prototype.attach = function ($container) {
    $container.html(
      '<div class="timed-assessment">' +
      '<h2>Timed Assessment</h2>' +
      '<p>La biblioteca está funcionando correctamente.</p>' +
      '</div>'
    );
  };

  return TimedAssessment;

})();