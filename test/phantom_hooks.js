module.exports = {
    afterEnd: function(runner) {
        var fs = require('fs');
        var coverage = runner.page.evaluate(function() {
            return window.__coverage__;
        });

        if (coverage) {
            console.log('Generating Coverage report');
            fs.write('coverage/coverage.json', JSON.stringify(coverage), 'w');
            fs.write('coverage/codeclimate.json', JSON.stringify(coverage), 'w');
        } else {
            console.log('No coverage data generated');
        }
    }
};
