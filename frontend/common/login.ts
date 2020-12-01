import React from 'react';
import {ButtonGroup, Icon} from '@blueprintjs/core';
import {ActionTypes} from "./actionTypes";
import {LogoutButton} from "./LogoutButton";
import {LoginScreen} from "./LoginScreen";

export default function (bundle) {
    bundle.defineAction(ActionTypes.LoginFeedback);
    bundle.addReducer(ActionTypes.LoginFeedback, loginFeedbackReducer);

    bundle.defineAction(ActionTypes.LogoutFeedback);
    bundle.addReducer(ActionTypes.LogoutFeedback, logoutFeedbackReducer);
}

function loginFeedbackReducer(state, {payload: {user, error}}) {
    if (error) {
        return state;
    }

    window.localStorage.user = JSON.stringify(user);

    return state.set('user', user);
}

function logoutFeedbackReducer(state, _action) {
    window.localStorage.user = '';

    return state.set('user', false);
}
