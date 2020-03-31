import * as React from 'react';

const PythonVariableValue = (props) => {
    if (!props.value) {
        return (<React.Fragment></React.Fragment>);
    }

    if (props.value instanceof Sk.builtin.list) {
        const nbElements = props.value.v.length;

        return (
            <React.Fragment>
                [{props.value.v.map((element, index) => (
                    <span key={index}>
                        <PythonVariableValue value={element} />
                        {(index + 1) < nbElements ? ', ' : null}
                    </span>
                ))}]
            </React.Fragment>
        )
    }

    if (props.value instanceof Sk.builtin.str) {
        return (
            <React.Fragment>
                "{props.value.v}"
                {props.value._old ? <span className="value-previous">"{props.value._old}"</span> : null }
            </React.Fragment>
        )
    }

    return (
        <React.Fragment>
            <span>{props.value.v}</span>
            {(props.value._old !== undefined) ? <span className="value-previous">{props.value._old}</span> : null }
        </React.Fragment>
    );
};

export default PythonVariableValue;