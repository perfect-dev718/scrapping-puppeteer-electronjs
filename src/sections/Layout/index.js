import React from 'react';
import Hearder from '../Header';
import Footer from '../Footer';

const Layout = (props) => {
  return(
    <div>
      <Hearder />
      <div className="px-md-5">
          {props.children}
      </div>
      <Footer />
    </div>
  );
}

export default Layout;