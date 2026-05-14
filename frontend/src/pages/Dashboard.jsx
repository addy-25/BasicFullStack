import { useEffect, useState } from "react";

import axios from "axios";

function Dashboard() {

  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");

  const fetchTasks = async () => {

    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://127.0.0.1:8000/tasks",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setTasks(response.data);
  };

  useEffect(() => {

    fetchTasks();

  }, []);

  const createTask = async () => {

    const token = localStorage.getItem("token");

    await axios.post(
      "http://127.0.0.1:8000/tasks",
      {
        title
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    fetchTasks();
  };

  return (

    <div>

      <h1>Dashboard</h1>

      <input
        placeholder="Task title"
        onChange={(e) => setTitle(e.target.value)}
      />

      <button onClick={createTask}>
        Add Task
      </button>

      <ul>

        {tasks.map((task) => (

          <li key={task.id}>
            {task.title}
          </li>

        ))}

      </ul>

    </div>
  );
}

export default Dashboard;