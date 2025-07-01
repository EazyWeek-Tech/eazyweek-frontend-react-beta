import React, {useEffect} from "react";
import { API_BASE_URL } from "../../config";




const Dashboard = () => {
const testGetSession = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET",
      credentials: "include"
    });
    const data = await response.json();
    console.log("Session Data from GET:", data);
  } catch (error) {
    console.error("Error fetching session:", error);
  }
};
  useEffect(() => {
  const fetchSession = async () => {
    const res = await fetch(`${API_BASE_URL}/api/session/get`, {
      method: "GET",
      credentials: "include"
    });
    const sessionData = await res.json();
    console.log("Session Info:", sessionData);
  };

  fetchSession();
}, []);


  return   <h2>Dashboard Page</h2>
  //<button onClick={testGetSession}>Test Get Session</button>
;

  
};

export default Dashboard;