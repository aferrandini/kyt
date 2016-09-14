// jest.enableAutomock();
jest.mock('webpack-dev-middleware');
jest.mock('webpack-hot-middleware');
jest.mock('../../logger');
jest.mock('../../../utils/paths');
jest.mock('../../../utils/buildConfigs');
jest.mock('../../../utils/webpackCompiler');
jest.mock('express');
jest.setMock('../../../utils/ifPortIsFreeDo',
  jest.fn((port, todo) => { todo(); })
);
jest.setMock('path', {
  resolve: p => p,
});
jest.mock('nodemon');
jest.mock('chokidar');
jest.setMock('shelljs', {
  test: () => true,
  rm: () => ({ code: 0 }),
});

describe('dev', () => {
  const chokidar = require('chokidar');
  const nodemon = require('nodemon');
  const devMiddleware = require('webpack-dev-middleware');
  const express = require('express');
  const logger = require('../../logger');
  const ifPortIsFreeDo = require('../../../utils/ifPortIsFreeDo');
  const webpackCompiler = require('../../../utils/webpackCompiler');
  const buildConfigs = require('../../../utils/buildConfigs');

  let clientCompilerDone;
  let serverCompilerDone;

  require('../dev')();

  it('cleans the build directory', () => {
    expect(logger.task).toBeCalledWith('Cleaned ./build');
  });

  it('watches files for server restarting', () => {
    const ready = chokidar.on.mock.calls[0][1];
    expect(typeof ready).toBe('function');
    ready();
    expect(chokidar.on.mock.calls.length).toBe(6);
  });

  it('starts client dev server', () => {
    expect(ifPortIsFreeDo).toBeCalled();
    expect(webpackCompiler).toBeCalled();
    expect(buildConfigs).toBeCalled();

    // start client
    expect(devMiddleware).toBeCalled();
    expect(express).toBeCalled();
    expect(express.use.mock.calls.length).toBe(2);
    expect(express.listen).toBeCalledWith('clientPort');
  });

  it('webpack compiler', () => {
    // clientCompiler
    clientCompilerDone = webpackCompiler.mock.calls[0][1];
    expect(webpackCompiler.mock.calls[0][0]).toBe('clientConfig');
    expect(typeof clientCompilerDone).toBe('function');

    // serverCompiler
    serverCompilerDone = webpackCompiler.mock.calls[1][1];
    expect(webpackCompiler.mock.calls[1][0]).toBe('serverConfig');
    expect(typeof serverCompilerDone).toBe('function');
  });

  it('client compilation done', () => {
    clientCompilerDone();
    expect(logger.task).toBeCalledWith('Client assets serving from publicPath');
  });

  it('server compilation done', () => {
    serverCompilerDone();

    expect(nodemon).toBeCalledWith({ script: 'fakePath', watch: ['fakePath'] });

    // nodemon.once
    expect(nodemon.once.mock.calls[0][0]).toBe('start');
    nodemon.once.mock.calls[0][1]();
    expect(logger.task).toBeCalled();
    expect(logger.end).toBeCalledWith('Development started');

    // on restart
    expect(nodemon.on.mock.calls[0][0]).toBe('restart');
    nodemon.on.mock.calls[0][1]();
    expect(logger.task).toBeCalledWith('Development server restarted');

    // on quit
    expect(nodemon.on.mock.calls[1][0]).toBe('quit');
  });
});
