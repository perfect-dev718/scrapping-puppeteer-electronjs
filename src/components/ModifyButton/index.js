import React from 'react';
import Button from 'react-bootstrap/Button';
import history from '../../utils/history';

const ModifyButton = (props) => {
  var text = props.props.text;
  var width = props.props.width;
  var height = props.props.height;
  var link = props.props.link;
  return (
    <Button variant='outline-secondary' 
      className='mx-4 my-4' 
      style={{width:width, height:height}}
      onClick={()=>history.push(link)}>
        {text}
    </Button> 
  );
}

export default ModifyButton;