"use client";

import { createContext, useContext, useState } from "react";

interface EditModeContextValue {
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  isAdmin: boolean;
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: false,
  setEditMode: () => {},
  isAdmin: false,
});

export function useEditMode() {
  return useContext(EditModeContext);
}

export function EditModeProvider(props: { isAdmin: boolean; children: React.ReactNode }) {
  const [editMode, setEditMode] = useState(false);

  return (
    <EditModeContext.Provider value={{ editMode, setEditMode, isAdmin: props.isAdmin }}>
      {props.children}
    </EditModeContext.Provider>
  );
}
