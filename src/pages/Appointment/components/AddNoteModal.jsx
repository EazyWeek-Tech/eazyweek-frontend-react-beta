import React, {useState} from "react";

const AddNoteModal = ({ onClose, onSubmit }) => {

  const [note, setNote] = useState("");

  const handleSave = () => {
    if (note.trim()) {
      onSubmit(note);
    }
  };
  return (
    <div className="popouter" id="addnote">
      <div className="popovrly"></div>
      <div className="popin">
        <div className="popuphdr">
          Add Note
          <span className="clsbtn" onClick={onClose}>
            <img src={`${import.meta.env.BASE_URL}images/clsic.svg`} alt="Close" />

          </span>
        </div>

        <div className="popfrm">
          <div className="frmdiv">
            <label htmlFor="note">
              Add Note: <span className="rd">*</span>
            </label>
            <textarea
        placeholder="Enter your note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
          </div>

          <div className="btnbar">
            <input
              type="submit"
              className="prilnk"
              value="Add Note"
              onClick={handleSave}
            />
            <input
              type="button"
              className="seclnk"
              value="Cancel"
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNoteModal;
