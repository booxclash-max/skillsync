import axios from "axios";

// ⚠️ PASTE YOUR NEW NGROK URL HERE (From Colab Step 4 output)
const API_URL = "http://localhost:8000"; // <--- UPDATE THIS URL

// Configure Axios with the "Magic Header" to bypass Ngrok warning
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        "ngrok-skip-browser-warning": "69420", // <--- THIS FIXES THE ISSUE
    }
});

// 1. Upload PDF
export const uploadPDF = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    // Note: We don't use apiClient here because FormData requires special headers
    // But we still attach the skip-warning header manually
    const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
            "ngrok-skip-browser-warning": "69420",
            "Content-Type": "multipart/form-data"
        }
    });
    return response.data;
};

// 2. Start Simulation (Call /start-simulation endpoint)
export const startSimulation = async () => {
    try {
        const response = await apiClient.post(`/start-simulation`);
        return response.data;
    } catch (error) {
        console.error("Start Sim Error:", error);
        throw error;
    }
};

// 3. Send Simulation Move
export const sendSimulationMove = async (action, history) => {
    try {
        const response = await apiClient.post(`/simulate`, {
            action: action,
            history: history
        });
        return response.data;
    } catch (error) {
        console.error("Sim Move Error:", error);
        throw error;
    }
};