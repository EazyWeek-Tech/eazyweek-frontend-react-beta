import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import FaceMapperReadOnly from "./FaceMapperReadOnly";
import SignaturePad from "./SignaturePad";
import FileUploader from "./FileUploader";
import SignaturePadReadOnly from "./SignaturePadReadOnly";
import "./ConsultationForm.css";

const ConsultationHistory = () => {
    const [searchParams] = useSearchParams();
    const custId = searchParams.get("custid");

    const [consultations, setConsultations] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!custId) {
            setErr("No custid provided.");
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`${API_BASE_URL}/api/consultation/get/${custId}`, {
            credentials: "include",
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => setConsultations(Array.isArray(data) ? data : []))
            .catch((e) => {
                console.error(e);
                setErr("Failed to fetch consultation history.");
            })
            .finally(() => setLoading(false));
    }, [custId]);

    const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    if (loading) return <p>Loading consultation history...</p>;
    if (err) return <p style={{ color: "red" }}>{err}</p>;

    return (
        <div className="confrmwrp">
            <h1 className="page-title">Consultation History</h1>
            <p style={{ color: "#555" }}>
                Showing records for <b>custId:</b> {custId}
            </p>

            {consultations.length === 0 ? (
                <p>No consultation forms found.</p>
            ) : (
                consultations.map((form) => {
                    const id = form.id ?? `${form.appointmentDate}-${form.chiefComplaint}`;
                    const isOpen = expanded[id] ?? false;

                    return (
                        <div
                            key={id}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                marginBottom: "1.5rem",
                            }}
                        >
                            <div
                                style={{
                                    padding: "12px 16px",
                                    cursor: "pointer",
                                    background: "#f8f9fb",
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                                onClick={() => toggle(id)}
                            >
                                <div>
                                    <strong>
                                        {form.appointmentDate || "(no date)"} — {form.chiefComplaint}
                                    </strong>
                                    <div style={{ fontSize: "14px", color: "#555" }}>
                                        Diagnosis: {form.diagnosis} &middot; Provider:{" "}
                                        {form.providerName || "N/A"}
                                    </div>
                                </div>
                                <span style={{ fontSize: 12, color: "#666" }}>
                                    {isOpen ? "Hide" : "Show"} details
                                </span>
                            </div>

                            {isOpen && (
                                <div style={{ padding: "1rem" }}>
                                    <ReadOnlyField
                                        label="Appointment Date"
                                        value={form.appointmentDate}
                                        type="date"
                                    />
                                    <ReadOnlyCheckbox
                                        label="Changes in Health"
                                        value={form.changesInHealth}
                                    />
                                    <ReadOnlyCheckbox
                                        label="Changes in Meds"
                                        value={form.changesInMeds}
                                    />

                                    {[
                                        { id: "chiefComplaint", label: "Chief Complaint", value: form.chiefComplaint },
                                        { id: "diagnosis", label: "Diagnosis", value: form.diagnosis },
                                        { id: "treatmentPlan", label: "Treatment Plan", value: form.treatmentPlan },
                                        { id: "subjectiveNotes", label: "Subjective Notes", value: form.subjectiveNotes },
                                        { id: "objectiveNotes", label: "Objective Notes", value: form.objectiveNotes },
                                        { id: "assessmentNotes", label: "Assessment Notes", value: form.assessmentNotes },
                                        { id: "planningNotes", label: "Planning Notes", value: form.planningNotes },
                                    ].map((field) => (
                                        <ReadOnlyField
                                            key={field.id}
                                            label={field.label}
                                            value={field.value}
                                        />
                                    ))}

                                    {form.files && form.files.length > 0 ? (
                                        <div className="cnfrmcellwrp">
                                            <label><strong>Uploaded Files</strong></label>
                                            <ul>
                                                {form.files.map((file) => (
                                                    <li key={file.id} style={{ cursor: "pointer", color: "#1a73e8" }}>
                                                        <a
                                                            href={`${API_BASE_URL}${file.fileUrl}`} // fileUrl comes as /api/consultation/file/{blobName}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            {file.fileName}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p>No files uploaded.</p>
                                    )}


                                    {form.faceZones && form.faceZones.length > 0 && (
                                        <div className="cnfrmcellwrp">
                                            <label><strong>Face Zones</strong></label>
                                            <FaceMapperReadOnly zones={form.faceZones} width={400} height={400} backgroundImageUrl='../images/facediagram.jpg' />
                                        </div>
                                    )}

                                    <div className="cnfrmcellwrp">
                                        {form.signature ? (
                                            <div className="cnfrmcellwrp">
                                                <label><strong>Signature</strong></label>
                                                <SignaturePadReadOnly
                                                    base64={form.signature}
                                                    width={600}
                                                    height={200}
                                                />
                                            </div>
                                        ) : (
                                            <p>No signature available.</p>
                                        )}
                                    </div>

                                    <ReadOnlyField
                                        label="Signature Date"
                                        value={form.signatureDate}
                                        type="date"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default ConsultationHistory;

const ReadOnlyField = ({ label, value, type = "text" }) => (
    <div className="cnfrmcellwrp">
        <label><strong>{label}</strong></label>
        <input
            type={type}
            value={value || ""}
            readOnly
            style={{
                width: "100%",
                marginBottom: "1rem",
                padding: "0.5rem",
                backgroundColor: "#f9f9f9",
                border: "1px solid #ccc",
                borderRadius: "4px",
            }}
        />
    </div>
);

const ReadOnlyCheckbox = ({ label, value }) => (
    <div className="cnfrmcellwrp">
        <label><strong>{label}</strong></label>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
            <label>
                <input type="checkbox" checked={value === true} disabled /> Yes
            </label>
            <label>
                <input type="checkbox" checked={value === false} disabled /> No
            </label>
        </div>
    </div>
);
