import React, { useState } from "react";
import { Text, TextInput, View, Pressable } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfileAPI } from "@/src/api";
import { colors } from "@/src/theme";
import { Sheet, ActionButton, Notice, ui } from "./screen-ui";

export function AddChildSheet({ visible, onClose, existingChildren: existing }: { visible: boolean; onClose: () => void; existingChildren: any[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: (child: any) => ProfileAPI.update({ children: [...existing, child] }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); setName(""); setDob(""); setInterests([]); setError(""); onClose(); }, onError: () => setError("Couldn’t add your child. Please try again.") });
  const submit = () => {
    const date = new Date(`${dob}T00:00:00`);
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(date.getTime()) || date > new Date() || date.getFullYear() < new Date().getFullYear() - 18 || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` !== dob) { setError("Enter a first name and valid date of birth (YYYY-MM-DD) for a child under 18."); return; }
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age--;
    mutation.mutate({ name: name.trim(), age, interests, sensory_preferences: [], communication_style: "verbal" });
  };
  return <Sheet visible={visible} title="Add a child" description="Help other parents find age-appropriate playdates. Only a first name and age are shared." onClose={() => { if (!mutation.isPending) onClose(); }}><Text style={ui.label}>First name</Text><TextInput testID="child-name" style={ui.input} value={name} onChangeText={setName} placeholder="First name" /><Text style={ui.label}>Date of birth</Text><TextInput testID="child-dob" style={ui.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /><Text style={ui.label}>What do they enjoy?</Text><View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{["Soccer", "Drawing", "Reading"].map(label => <Pressable key={label} onPress={() => setInterests(items => items.includes(label) ? items.filter(i => i !== label) : [...items, label])} style={{ borderRadius: 20, padding: 12, backgroundColor: interests.includes(label) ? colors.surfaceTertiary : colors.surface }}><Text style={{ color: interests.includes(label) ? colors.brandPrimary : colors.onSurface }}>{label}</Text></Pressable>)}</View><Text style={[ui.description, { marginTop: 16 }]}>The date of birth is private. Other parents only see your child’s age.</Text>{!!error && <Notice error>{error}</Notice>}<ActionButton label="Add child" testID="child-submit" loading={mutation.isPending} onPress={submit} /><ActionButton label="Cancel" secondary disabled={mutation.isPending} onPress={onClose} /></Sheet>;
}
