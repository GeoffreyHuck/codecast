import 'es5-shim';
import 'es6-shim';
import 'array.prototype.fill'; // Array.prototype.fill
import 'es6-symbol/implement'; // Symbol.iterator
import './style.scss';

import url from 'url';
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import Immutable from 'immutable';
import installDevTools from 'immutable-devtools';
import 'rc-slider/dist/rc-slider.css?global';


import link from './linker';

import commonBundle from './common/index';
import sandboxBundle from './sandbox/index';
import playerBundle from './player/index';
import recorderBundle from './recorder/index';
import editorBundle from './editor/index';
import statisticsBundle from './statistics/index';

/**
 * List of actions not to write in the console in development mode.
 *
 * @type {Object}
 */
const DEBUG_IGNORE_ACTIONS_MAP = {
  'Window.Resized': true,
  'Buffer.Reset': true,
  'Buffer.Highlight': true,
  'Buffer.Init': true,
  'Buffer.Model.Edit': true,
  'Player.Tick': true
};

const {store, scope, actionTypes, views, finalize, start} = link(function (bundle, deps) {

  bundle.defineAction('init', 'System.Init');
  bundle.addReducer('init', (_state, _action) => {
    return Immutable.Map({scope, actionTypes, views});
  });

  bundle.include(commonBundle);
  bundle.include(sandboxBundle);
  bundle.include(playerBundle);
  bundle.include(recorderBundle);
  bundle.include(editorBundle);
  bundle.include(statisticsBundle);

  if (process.env.NODE_ENV === 'development') {
    bundle.addEarlyReducer(function (state, action) {
      if (!DEBUG_IGNORE_ACTIONS_MAP[action.type]) {
          console.log('action', action);
      }

      return state;
    });

    /**
     * Enable Immutable debug dev-tools.
     *
     * @see https://github.com/andrewdavey/immutable-devtools
     */
    installDevTools(Immutable);
  }

}/*, {reduxSaga: {sagaMonitor}}*/);
finalize(scope, actionTypes);

function restart () {
  if (Codecast.task) {
    Codecast.task.cancel();
    Codecast.task = null;
  }
  /* XXX Make a separate object for selectors in the linker? */
  Codecast.task = start({
    dispatch: store.dispatch,
    globals: scope,
    selectors: scope,
    actionTypes,
    views
  });
}

/* In-browser API */
const Codecast = window.Codecast = {store, scope, restart};

/*
  options :: {
    start: 'sandbox'|'player'|'recorder'|'editor',
    baseUrl: url,
    examplesUrl: url,
    baseDataUrl: url,
    user: {…},
    platform: 'python'|'unix'|'arduino',
    controls: {…},
    showStepper: boolean,
    showStack: boolean,
    showViews: boolean,
    showIO: boolean,
    source: string,
    input: string,
    token: string
  }
*/

function clearUrl () {
  const currentUrl = url.parse(document.location.href, true)
  delete currentUrl.search
  delete currentUrl.query.source
  window.history.replaceState(null, document.title, url.format(currentUrl))
}

Codecast.start = function (options) {

  store.dispatch({type: scope.init, payload: {options}});

  // remove source from url wihtout reloading
  if (options.source) {
    clearUrl();
  }
  // XXX store.dispatch({type: scope.stepperConfigure, options: stepperOptions});

  /* Run the sagas (must be done before calling autoLogin) */
  restart();

  if (/editor|player|sandbox/.test(options.start)) {
    store.dispatch({type: scope.statisticsInitLogData});
  }

  let App;
  switch (options.start) {
    case 'recorder':
      autoLogin();
      store.dispatch({type: scope.recorderPrepare});
      App = scope.RecorderApp;
      break;
    case 'player':
      let audioUrl = options.audioUrl || `${options.baseDataUrl}.mp3`;
      store.dispatch({
        type: scope.playerPrepare,
        payload: {
          baseDataUrl: options.baseDataUrl,
          audioUrl: audioUrl,
          eventsUrl: `${options.baseDataUrl}.json`,
          data: options.data
        }
      });
      App = scope.PlayerApp;
      break;
    case 'editor':
      autoLogin();
      store.dispatch({
        type: scope.editorPrepare,
        payload: {
          baseDataUrl: options.baseDataUrl
        }
      });
      App = scope.EditorApp;
      break;
    case 'statistics':
      autoLogin();
      store.dispatch({
        type: scope.statisticsPrepare
      });
      App = scope.StatisticsApp;
      break;
    case 'sandbox':
      store.dispatch({
        type: scope.statisticsLogLoadingData
      });
      App = scope.SandboxApp;
      break;
    default:
      App = () => <p>{"No such application: "}{options.start}</p>;
      break;
  }

  const {AppErrorBoundary} = scope;
  const container = document.getElementById('react-container');
  ReactDOM.render(
    <Provider store={store}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </Provider>, container);

};

function autoLogin () {
  let user = null;
  try {
    user = JSON.parse(window.localStorage.user || 'null');
  } catch (ex) {
    return;
  }
  store.dispatch({type: scope.loginFeedback, payload: {user}});
}
