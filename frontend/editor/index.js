
import Immutable from 'immutable';
import React from 'react';
import classnames from 'classnames';
import {call, put, select, take, takeEvery, takeLatest} from 'redux-saga/effects';

import {Button} from '../ui';
import {getJson} from '../common/utils';

export default function (bundle, deps) {

  bundle.addReducer('init', state =>
    state.set('editor', Immutable.Map()));

  bundle.defineAction('editorPrepare', 'Editor.Prepare');
  bundle.addReducer('editorPrepare', editorPrepareReducer);
  bundle.addSaga(editorSaga);

  bundle.defineAction('editorConfigured', 'Editor.Configured');
  bundle.addReducer('editorConfigured', editorConfiguredReducer);

  bundle.defineAction('editorDataUrlChanged', 'Editor.DataUrl.Changed');
  bundle.addReducer('editorDataUrlChanged', editorDataUrlChangedReducer);

  bundle.defineAction('editorLoad', 'Editor.Load');
  bundle.addReducer('editorLoad', editorLoadReducer);
  bundle.defineAction('editorLoaded', 'Editor.Loaded');
  bundle.addReducer('editorLoaded', editorLoadedReducer);

  bundle.defineAction('editorUnload', 'Editor.Unload');
  bundle.addReducer('editorUnload', editorUnloadReducer);

  bundle.defineAction('editorSubtitlesSelected', 'Editor.Subtitles.Selected');

  bundle.defineView('EditorApp', EditorAppSelector, EditorApp);
  bundle.defineView('LoadScreen', LoadScreenSelector, LoadScreen);
  bundle.defineView('SetupScreen', SetupScreenSelector, SetupScreen);
  bundle.defineView('EditScreen', EditScreenSelector, EditScreen);

};

function editorPrepareReducer (state, {payload: {dataUrl}}) {
  return state.set('editor', Immutable.Map({dataUrl}));
}

function editorDataUrlChangedReducer (state, {payload: {dataUrl}}) {
  return state.setIn(['editor', 'dataUrl'], dataUrl);
}

function editorConfiguredReducer (state, {payload: {baseDataUrl}}) {
  return state.setIn(['editor', 'baseDataUrl'], baseDataUrl);
}

function* editorSaga () {
  const {editorPrepare, loginFeedback, editorLoad, editorUnload, editorSubtitlesSelected} = yield select(state => state.get('scope'));
  yield takeEvery(editorPrepare, editorPrepareSaga);
  yield takeEvery(loginFeedback, loginFeedbackSaga);
  yield takeLatest(editorLoad, editorLoadSaga);
  yield takeLatest(editorUnload, editorUnloadSaga);
  yield takeLatest(editorSubtitlesSelected, editorSubtitlesSelectedSaga);
}

function* editorPrepareSaga (_action) {
  const {switchToScreen} = yield select(state => state.get('scope'));
  yield put({type: switchToScreen, payload: {screen: 'load'}});
}

function* loginFeedbackSaga (_action) {
  const {editorConfigured, switchToScreen} = yield select(state => state.get('scope'));
  const baseUrl = yield select(state => state.get('baseUrl'));
  const {baseDataUrl} = yield call(getJson, `${baseUrl}/editor.json`);
  yield put({type: editorConfigured, payload: {baseDataUrl}});
}

function editorLoadReducer (state, {payload: {data}}) {
  return state.update('editor', editor =>
    editor.set('loading', true));
}

function* editorLoadSaga ({payload: {dataUrl}}) {
  const {playerPrepare, playerReady, editorLoaded, switchToScreen} = yield select(state => state.get('scope'));
  const audioUrl = `${dataUrl}.mp3`;
  const eventsUrl = `${dataUrl}.json`;
  yield put({type: playerPrepare, audioUrl, eventsUrl});
  const {data} = yield take(playerReady);
  yield put({type: editorLoaded, payload: {data}});
  yield put({type: switchToScreen, payload: {screen: 'setup'}});
}

function editorLoadedReducer (state, {payload: {data}}) {
  return state.update('editor', editor =>
    editor.set('data', data).set('loading', false));
}

function editorUnloadReducer (state, _action) {
  return state.update('editor', editor => editor.delete('data'));
}

function* editorUnloadSaga (_action) {
  const {playerClear, switchToScreen} = yield select(state => state.get('scope'));
  yield put({type: playerClear});
  yield put({type: switchToScreen, payload: {screen: 'load'}});
}

function* editorSubtitlesSelectedSaga ({payload: {key}}) {
  const {subtitlesSelected, subtitlesLoadSucceeded, switchToScreen} = yield select(state => state.get('scope'));
  yield put({type: subtitlesSelected, payload: {key}});
  yield take(subtitlesLoadSucceeded);
  yield put({type: switchToScreen, payload: {screen: 'edit'}});
}

function EditorAppSelector (state, props) {
  const scope = state.get('scope');
  const {LogoutButton, editorUnload} = scope;
  const user = state.get('user');
  const screen = state.get('screen');
  let activity;
  let screenProp;
  if (!user) {
    activity = 'login';
    screenProp = 'LoginScreen';
  } else if (screen === 'load') {
    activity = 'load';
    screenProp = 'LoadScreen';
  } else if (screen === 'setup') {
    activity = 'setup';
    screenProp = 'SetupScreen';
  } else if (screen === 'edit') {
    activity = 'edit';
    screenProp = 'EditScreen';
  } else if (screen === 'save') {
    activity = 'save';
    screenProp = 'SaveScreen';
  }
  return {Screen: screenProp && scope[screenProp], LogoutButton, editorUnload, activity};
}

class EditorApp extends React.PureComponent {
  render () {
    const {Screen, LogoutButton, activity} = this.props;
    return (
      <div>
        <LogoutButton/>
        {activity === 'setup' && <Button onClick={this._unload}><i className='fa fa-reply'/></Button>}
        {activity === 'edit' && <Button onClick={this._save} bsStyle='primary'><i className='fa fa-save'/></Button>}
        <Screen/>
      </div>
    );
  }
  _unload = () => {
    this.props.dispatch({type: this.props.editorUnload});
  };
  _save = () => {
    console.log('save and end editing');
  };
}

function LoadScreenSelector (state, props) {
  const {editorDataUrlChanged, editorLoad} = state.get('scope');
  const result = {editorDataUrlChanged, editorLoad};
  const editor = state.get('editor');
  result.dataUrl = editor.get('dataUrl');
  result.baseDataUrl = editor.get('baseDataUrl');
  result.loading = editor.get('loading');
  return result;
}

class LoadScreen extends React.PureComponent {
  render () {
    const {dataUrl, baseDataUrl, loading} = this.props;
    const isUrlOk = baseDataUrl && dataUrl.startsWith(baseDataUrl);
    return (
      <div>
        <div>
          <p>{"Enter the base URL of an existing Codecast:"}</p>
          <div className='form-inline'>
            <input type='text' className='form-control' onChange={this._urlChanged} value={dataUrl||''} />
            <Button disabled={!isUrlOk || loading} onClick={this._loadClicked}>
              {"Load"}
              {loading && <span>{" "}<i className='fa fa-hourglass-o'/></span>}
            </Button>
          </div>
          {baseDataUrl && !isUrlOk &&
            <p className='error'>
              {"The URL must start with "}{baseDataUrl||''}
            </p>}
          {baseDataUrl && isUrlOk &&
            <p>
              <i className='fa fa-check' style={{color: 'green'}}/>
              {" The URL is valid."}
            </p>}
        </div>
      </div>
    );
  }
  _urlChanged = (event) => {
    const dataUrl = event.target.value;
    this.props.dispatch({type: this.props.editorDataUrlChanged, payload: {dataUrl}});
  };
  _loadClicked = () => {
    this.props.dispatch({type: this.props.editorLoad, payload: {dataUrl: this.props.dataUrl}});
  };
}

function SetupScreenSelector (state, props) {
  const {editorSubtitlesSelected, subtitlesLoadedSelector} = state.get('scope');
  const editor = state.get('editor');
  const dataUrl = editor.get('dataUrl');
  const {version, subtitles} = editor.get('data')
  const loadedSubtitles = subtitlesLoadedSelector(state);
  return {editorSubtitlesSelected, loadedSubtitles, dataUrl, version, subtitles};
}

class SetupScreen extends React.PureComponent {
  render () {
    const {dataUrl, version, subtitles, loadedSubtitles} = this.props;
    return (
      <div>
        <div>
          <p>{"Editing "}{dataUrl}</p>
          <p>{"Version "}{version}</p>
          <p>{"Subtitles "}
            {(subtitles||[]).map(key =>
              <span key={key} onClick={this._subtitlesSelected} data-key={key} style={{marginRight: '10px', fontWeight: loadedSubtitles === key ? 'bold' : 'normal'}}>
                {key}
              </span>)}
          </p>
        </div>
        {/* TODO: button to switch to edit mode */}
      </div>
    );
  }
  _subtitlesSelected = (event) => {
    const {key} = event.currentTarget.dataset;
    this.props.dispatch({type: this.props.editorSubtitlesSelected, payload: {key}});
  };
}

function EditScreenSelector (state, props) {
  const {PlayerControls, MainView, MainViewPanes, SubtitlesBand, getPlayerState} = state.get('scope');
  const playerStatus = getPlayerState(state).get('status');
  const preventInput = !/ready|paused/.test(playerStatus);
  const viewportTooSmall = state.get('viewportTooSmall');
  const containerWidth = state.get('containerWidth');
  const showSubtitlesBand = state.get('showSubtitlesBand');
  return {
    preventInput, viewportTooSmall, containerWidth,
    PlayerControls, MainView, MainViewPanes,
    showSubtitlesBand, SubtitlesBand
  };
}

class EditScreen extends React.PureComponent {
  render () {
    const {preventInput, containerWidth, viewportTooSmall, PlayerControls, MainView, MainViewPanes, showSubtitlesBand, SubtitlesBand} = this.props;
    return (
      <div id='main' style={{width: `${containerWidth}px`}} className={classnames([viewportTooSmall && 'viewportTooSmall'])}>
        <PlayerControls/>
        <div id='mainView-container'>
          <MainView preventInput={preventInput}/>
          <MainViewPanes/>
        </div>
        {showSubtitlesBand && <SubtitlesBand/>}
      </div>
    );
  }
}

/*
function subtitlesAddLanguageReducer (state, action) {
  return state.updateIn(['player', 'data'],
    data => update(data, {subtitles: {$push: [key]}}));
}
*/