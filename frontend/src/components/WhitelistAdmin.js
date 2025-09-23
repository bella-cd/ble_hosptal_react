import { useState, useEffect } from "react";
import axios from "axios";

function WhitelistAdmin() {
  const [items, setItems] = useState([]);
  const [mac, setMac] = useState("");
  const [error, setError] = useState("");
  const username = localStorage.getItem("username");

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, []);

  const fetchList = () => {
    axios.get("/api/whitelist", { headers: { "X-User": username } })
      .then(res => setItems(res.data))
      .catch(() => setItems([]));
  };

  const addMac = async () => {
    setError("");
    if (!mac.trim()) return;
    try {
      await axios.post("/api/whitelist", { mac }, { headers: { "X-User": username } });
      setItems([...items, { mac }]);
      setMac("");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to add MAC");
    }
  };

  const deleteMac = async (macToDelete) => {
    await axios.delete(`/api/whitelist/${macToDelete}`, { headers: { "X-User": username } });
    setItems(items.filter(item => item.mac !== macToDelete));
  };

  return (
    <div className="card">
      <h2>Beacon Whitelist</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <input
          placeholder="MAC address"
          value={mac}
          onChange={e => setMac(e.target.value)}
          className="form-input"
        />
        <button onClick={addMac} className="btn">Add MAC</button>
      </div>
      {error && <div className="msg">{error}</div>}
      <table className="table">
        <thead>
          <tr><th>MAC Address</th><th>Action</th></tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.mac}>
              <td>{item.mac}</td>
              <td>
                <button
                  onClick={() => deleteMac(item.mac)}
                  className="btn btn-danger"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default WhitelistAdmin;
