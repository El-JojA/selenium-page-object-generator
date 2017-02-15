#!/usr/bin/env node
'use strict';

var ArgumentParser = require('argparse').ArgumentParser;
var path = require('path');
var rootDir = path.join(__dirname, '..');
var packagejson = require(path.join(rootDir, 'package.json'));


var parser = new ArgumentParser({
    description: packagejson.description,
    version: packagejson.version
});

parser.addArgument(['-t', '--target'], {
    choices: ['cs', 'java', 'robot', 'groovy'],
    help: 'Generator target',
    required: true
});
parser.addArgument(['-n', '--name'], {
    help: 'Page name (no spaces)',
    required: true
});
parser.addArgument(['-d', '--destination'], {
    help: 'Destination page name (no spaces)',
    required: false
});
parser.addArgument(['-s', '--source'], {
    help: 'Source file',
    required: true
});

/** Set the parameters as fixed for the moment for testing

    The following code was added to haddle static parameters, to restore the parameter
    uncomment the block of code above this comment. And uncomment the line of code:
        args = parser.parseArgs();
    which is commented a couple of lines bellow.
*/

var _target = "java";
var _name = "uistgPageObject";
var _destination = null;
var _source = "uistg.html";
var _args ={
    target:_target,
    name:_name,
    destination:_destination,
    source:_source
};
var args;
//args= _args;
args = parser.parseArgs();


var execDir = process.cwd();
var fs = require('fs');
var jsdom = require('jsdom');
var mkdirp = require('mkdirp');
var commonDir = path.join(rootDir, 'src', 'common');
var common = require(path.join(commonDir, 'common.js'));
global.Handlebars = require(path.join(rootDir, 'libs', 'handlebars-v3.0.3.js'));
require(path.join(commonDir, 'helpers.js'));

var overrides = {
    model: {
        name: args.name.replace(/\s+/g, ''),
        target: args.destination
    }
};

var paths = {
    config: path.join(rootDir, 'configs', args.target + '.json'),
    source: path.join(execDir, args.source),
    target: path.join(execDir, args.name + '.' + args.target),
    template: path.join(rootDir, 'templates', args.target + '.handlebars')
};

var targets = {
    cs: { label: 'C#' },
    java: { label: 'Java' },
    robot: { label: 'Robot Framework' }
};

function getFileContent(path) {
    var response = '';
    try {
        response = fs.readFileSync(path, 'utf-8');
    }
    catch (ex) {
        if (ex.code === 'ENOENT') {
            console.error(path + ' does not exist.');
        }
        throw ex;
    }
    return response;
}

var jsdomConfig = {
    file: paths.source,
    scripts: [path.join(rootDir, 'libs', 'treewalker-polyfill-0.2.0.js'),
              path.join(commonDir, 'common.js'),
              path.join(commonDir, 'generator.js'),
              path.join(rootDir, 'libs', 'json2.js')],
    done: function (err, window) {
        try {
            jsdom.getVirtualConsole(window).sendTo(console);
            //var specs = targets[args.target];
            var config = require(paths.config);
            config = window.common.setDefaultValues(config);
            overrides.model.include = config.model.include;
            overrides.model.namespace = config.model.namespace;
            var input = Object.extend({}, config, overrides);
            var output = window.POG.generate(input);
            var template = getFileContent(paths.template);
            var generated = (Handlebars.compile(template))(output.out);
            mkdirp.sync(path.dirname(paths.target));
            fs.writeFileSync(paths.target, generated);
            //fs.writeFileSync("log.txt", JSON.stringify(output.logz));
            console.log('The file is saved: ' + paths.target);
        }
        catch (ex) {
            throw ex;
        }
        finally {
            window.close();
        }
    }
};

var window = jsdom.env(jsdomConfig);


