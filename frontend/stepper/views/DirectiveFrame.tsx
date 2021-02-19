import React from 'react';
import {Panel} from "react-bootstrap";
import {Button} from "@blueprintjs/core";
import {StepperControls} from "../index";

interface DirectiveFrameProps {
    directive?: any,
    controls?: StepperControls,
    title?: string,
    hasFullView?: boolean,
    onChange?: Function
}

export class DirectiveFrame extends React.PureComponent<DirectiveFrameProps> {
    onToggleFullView = () => {
        const {directive, controls, onChange} = this.props;
        const update = {fullView: !controls.fullView};
        onChange(directive, update);
    };

    render() {
        const {directive, controls, title, hasFullView} = this.props;
        const {key} = directive;
        const fullView = controls.fullView;
        const style = {width: '100%'};
        const width = directive.byName['width'];
        if (width && width[0] === 'number') {
            style.width = `${width[1] * 100}%`;
        }

        return (
            <div key={key} className='directive-view' style={style}>
                <Panel className='directive'>
                    <Panel.Heading>
                        <div className="directive-header">
                            <div className="pull-right">
                                {hasFullView &&
                                <Button onClick={this.onToggleFullView} small>
                                    {fullView ? 'min' : 'max'}
                                </Button>}
                            </div>
                            <div className="directive-title">
                                {title || key}
                            </div>
                        </div>
                    </Panel.Heading>
                    <Panel.Body>
                        {this.props.children}
                    </Panel.Body>
                </Panel>
            </div>
        );
    }
}
