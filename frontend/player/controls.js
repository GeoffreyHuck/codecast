
import React from 'react';
import {Button, Slider} from '@blueprintjs/core';

import {formatTime} from '../common/utils';

export default function (bundle, deps) {

  bundle.use(
    'playerStart', 'playerPause', 'playerResume', 'playerSeek',
    'getPlayerState',
    'StepperControls', 'Menu'
  );

  bundle.defineSelector('PlayerControlsSelector', function (state, props) {
    const getMessage = state.get('getMessage');
    const player = deps.getPlayerState(state);
    const status = player.get('status');
    const audioTime = player.get('audioTime');
    const duration = player.get('duration');
    return {getMessage, status, audioTime, duration};
  });

  class PlayerControls extends React.PureComponent {

    onStartPlayback = () => {
      const {status} = this.props;
      if (status === 'ready') {
        this.props.dispatch({type: deps.playerStart});
      } else if (status === 'paused') {
        this.props.dispatch({type: deps.playerResume});
      }
    };

    onPausePlayback = () => {
      this.props.dispatch({type: deps.playerPause});
    };

    onSeek = (audioTime) => {
      this.props.dispatch({type: deps.playerSeek, audioTime});
    };

    render () {
      const {status, audioTime, duration, getMessage} = this.props;
      const showStartPlayback = /preparing|starting|ready|paused/.test(status);
      const canStartPlayback = /ready|paused/.test(status);
      const showPausePlayback = /playing|pausing/.test(status);
      const canPausePlayback = status === 'playing';
      const canStep = /ready|paused/.test(status);
      return (
        <div id='player-controls'>
          <div className='player-controls-row row' style={{width: '100%', marginTop: '5px'}}>
            <div className="player-slider-container">
              {!Number.isNaN(duration) &&
                <Slider value={audioTime} onChange={this.onSeek}
                  stepSize={1000} labelStepSize={30000} min={0} max={duration}
                  labelRenderer={formatTime} />}
            </div>
          </div>
          <div className='player-controls-row row' style={{width: '100%', marginBottom: '4px'}}>
            <div className="player-controls controls controls-main col-sm-3">
              <div className="player-controls-playback">
                {showStartPlayback &&
                    <Button onClick={this.onStartPlayback} disabled={!canStartPlayback}
                      title={getMessage('START_PLAYBACK')} icon='play' />}
                {showPausePlayback &&
                  <Button onClick={this.onPausePlayback} disabled={!canPausePlayback}
                    title={getMessage('PAUSE_PLAYBACK')} icon='pause' />}
              </div>
              <div className="player-controls-times">
                {formatTime(audioTime)}
                {' / '}
                {formatTime(duration)}
              </div>
            </div>
            <div className="player-controls player-controls-stepper col-sm-7">
              <deps.StepperControls enabled={canStep}/>
            </div>
            <div className="player-controls player-controls-right col-sm-2">
              <deps.Menu/>
            </div>
          </div>
        </div>
      );
    };

  }
  bundle.defineView('PlayerControls', 'PlayerControlsSelector', PlayerControls);

};
