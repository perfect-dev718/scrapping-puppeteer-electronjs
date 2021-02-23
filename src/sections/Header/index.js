import React from 'react';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavLink from 'react-bootstrap/NavLink';
import history from '../../utils/history';

function Header(){
  return (
    <div>
      <Navbar collapseOnSelect expand="md" className="mt-3">
        <Navbar.Brand className='mx-md-3 mx-sm-0'
          onClick={()=>history.push('/main')}>
          Singularity Tech Scraper
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav" className="justify-content-end">
          <Nav>
            <NavLink onClick={()=>history.push('/manualupload')}>Manual Upload</NavLink>
            <NavLink onClick={()=>history.push('/autoscrape')}>Auto Scrape</NavLink>
            <NavLink>LinkedIn Scrape</NavLink>
            <NavLink onClick={()=>history.push('/manage')}>Manage Data</NavLink>
            <NavLink onClick={()=>history.push('/')}>Home</NavLink>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <hr className="mt-0"/>
  </div>
  );
}
export default Header;
