import React from 'react';
import {useState, useEffect, useRef} from 'react';
import Layout from '../../../sections/Layout';
import Button from 'react-bootstrap/Button';

const Manualupload = (props) => {
  const [allCsvData, setCsvData] = useState([]);
  let upload = useRef(null);
  useEffect(()=>{

  }, []);
  /**
   * function: This funcion occurs when the file is choosed.
   */
  const onFileChange = (event) => {
    var file = event.target.files[0];
    if(file == null) return;
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = async function(event) {        
    // The file's text will be printed here
      var csv = reader.result;
      var lines = csv.split("\n");
      var csvData = [];
      var headers= ['first_name', 'last_name', 'job_title', 'organisation', 'phone', 'email', 
                  'address1', 'address2', 'city', 'state', 'country', 'website', 'domain', 'program_segment', 'source'];
      for(var i=1; i<lines.length; i++){
        if(lines[i].length === 0) continue;
        var obj = {};
        var index = 0; // the index of the field
        var bInc = true; // if character is " false 
        var val = ""; // the value of the field
        for(var j=0; j<lines[i].length; j++){
          if(index >= headers.length) continue;
          if(lines[i][j] === "\"" && bInc){
            bInc = !bInc;
            continue;
          } else if(lines[i][j] === "\"" && !bInc){
            obj[headers[index]] = val;
            val = "";
            index++;
            bInc = !bInc;
            continue;
          }
          if(j !== 0 && lines[i][j-1] === "\"" && lines[i][j] === ",") continue;
          if(lines[i][j] === "," && bInc){
            obj[headers[index]] = val;
            val = "";
            index++;
            continue;
          }          
          val += lines[i][j];
        }
        if(checkExistEmail(obj.email)){
          csvData.push(obj);          
        }
      }  
      setCsvData(prevData => ([...prevData, ...csvData]));
    };    
  }
  /**
   * function: Check existing email
   * parameter: Email from csv file
   * return: If email exist return false, else return true
   */
  const checkExistEmail = (email) => {
    if(allCsvData == null) return true;
    var dd = allCsvData.filter(item => item.email === email);
    if(dd.length !== 0) return false;
    return true;
  }
  return (
    <Layout {...props}>
      <div className="text-center">
        <div className="container-fluid">
          <div className="row">
            <div className='col-md-10'>
              <span className="manualuploadtitle">
                Manual Upload Data
              </span>
            </div>      
            <div className='col-md-2'>
              <Button variant='outline-secondary' size='sm' onClick={()=>upload.click()}>Upload CSV</Button>
              <input type="file" accept=".csv" ref={(ref) => upload = ref} onChange={onFileChange} style={{display:"none"}}></input>
            </div>              
          </div>
        </div>
        <table className="table table-responsive" style={{marginTop:20, height:"70vh"}}>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th style={{width:'15%'}}>Job Title</th>
              <th>Organisation</th>
              <th>Phone</th>
              <th style={{width:'15%'}}>Email</th>
              <th>Address1</th>
              <th>Address2</th>
              <th>City</th>
              <th>State</th>
              <th>Country</th>
              <th style={{width:'15%'}}>Website</th>
              <th style={{width:'15%'}}>Domain</th>
              <th>Program Segment</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {
              allCsvData && allCsvData.map((item, index) => {
                return (
                  <tr key={index}>
                    <td>{item.first_name}</td>
                    <td>{item.last_name}</td>
                    <td>{item.job_title}</td>
                    <td>{item.organisation}</td>
                    <td>{item.phone}</td>
                    <td>{item.email}</td>
                    <td>{item.address1}</td>
                    <td>{item.address2}</td>
                    <td>{item.city}</td>
                    <td>{item.state}</td>
                    <td>{item.country}</td>
                    <td>{item.website}</td>
                    <td>{item.domain}</td>
                    <td>{item.program_segment}</td>
                    <td>{item.source}</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default Manualupload;
