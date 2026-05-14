import { useState } from "react";
import axios from "axios";

function Signup() {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const signup = async () => {

    try {

      const response = await axios.post(
        "http://127.0.0.1:8000/signup",
        {
          email,
          password
        }
      );

      alert(response.data.message);

    } catch (err) {

      console.log(err);

      alert("Signup failed");
    }
  };

  return (

    <div>

      <h1>Signup</h1>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />

      <button onClick={signup}>
        Signup
      </button>

    </div>
  );
}

export default Signup;