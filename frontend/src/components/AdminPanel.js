// Import React hooks and axios
import { useState, useEffect } from "react";
import axios from "axios";

// AdminPanel manages ESP-room mappings
function AdminPanel() {
  const [mappings, setMappings] = useState([]); // List of mappings
  const [form, setForm] = useState({ esp_id: "", room: "" }); // Form state
  const username = localStorage.getItem("username"); // Get username

  // Fetch mappings from backend
  useEffect(() => {
    axios.get("/api/esp-mapping", { headers: { "X-User": username } })
      .then(res => setMappings(res.data));
  }, [username]);

  // Add new mapping
  const addMapping = async () => {
    await axios.post("/api/esp-mapping", form, { headers: { "X-User": username } });
    const res = await axios.get("/api/esp-mapping", { headers: { "X-User": username } });
    setMappings(res.data);
    setForm({ esp_id: "", room: "" });
  };

  // Delete mapping
  const deleteMapping = async (esp_id) => {
    await axios.delete(`/api/delete-room/${esp_id}`, { headers: { "X-User": username } });
    setMappings(mappings.filter(m => m.esp_id !== esp_id));
  };

  // Render mappings table and form
  return (
    <div className="card p-4" style={{ maxWidth: 1000, margin: "auto", boxShadow: "0 6px 24px #0001" }}>
      <h2>ESP Mappings</h2>
      <div className="mb-3">
        <input placeholder="ESP ID" value={form.esp_id} onChange={e => setForm({ ...form, esp_id: e.target.value })} className="form-control mb-2" />
        <input placeholder="Room" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} className="form-control mb-2" />
        <button onClick={addMapping} className="btn btn-primary">Add Mapping</button>
      </div>
      <table className="table table-bordered">
        <thead><tr><th>ID</th><th>Room</th><th>Action</th></tr></thead>
        <tbody>
          {mappings.map((m, i) => (
            <tr key={i}>
              <td>{m.esp_id}</td>
              <td>{m.room}</td>
              <td><button onClick={() => deleteMapping(m.esp_id)} className="btn btn-danger btn-sm">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;
