// Where the data lives. Served locally (a static server with data/ pointing at the export) it sits beside the
// pages; on GitHub Pages (or any other host) it comes from the bucket, which allows every origin (CORS).
// The pages and the worker both read this (the page hands the worker its base in the 'load' message).
(function () {
  var h = self.location.hostname, local = h === 'localhost' || h === '127.0.0.1' || h === '' || /^192\.168\./.test(h);
  self.ZH_DATA_BASE = local ? 'data/' : 'https://storage.googleapis.com/zero-hour-stats-bucket/data/';
})();
