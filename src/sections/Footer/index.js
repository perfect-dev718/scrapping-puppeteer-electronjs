import React from 'react';
import {Nav, Navbar, NavLink} from 'react-bootstrap';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import { faCopyright } from '@fortawesome/free-solid-svg-icons';
import history from '../../utils/history';

const Footer = (props) => {
  return (    
    <div>
      <hr />
      <div className="text-center mt-5 mb-3">
        <Navbar className="justify-content-center">
          <Nav>
            <NavLink onClick={()=>history.push('/manualupload')}>Manual Upload</NavLink>
            <NavLink onClick={()=>history.push('/autoscrape')}>Auto Scrape</NavLink>
            <NavLink>LinkedIn Scrape</NavLink>
            <NavLink onClick={()=>history.push('/manage')}>Manage Data</NavLink>
          </Nav>
        </Navbar>
        <span className="singulartech" onClick={()=>history.push('/')}>
          <FontAwesomeIcon icon={faCopyright} /> 
          &nbsp;&nbsp;Singularity Tech
        </span>
      </div>
    </div>
  );
}

export default Footer;
