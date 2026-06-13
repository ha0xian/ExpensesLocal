import { useState } from "react";
import { Field, Panel, Table } from "../components/ui.jsx";

const categoryGroups = ["Needs", "Wants", "Growth", "Savings", "Business", "Other"];
const taxOptions = ["No", "Maybe", "Yes"];
const envelopeStyles = ["Monthly bill", "Variable", "Sinking fund", "Savings goal", "Temporary"];

export function CategoriesView({
  state,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory
}) {
  const [categoryForm, setCategoryForm] = useState({ name: "", group: "Needs", defaultBudget: "0", taxBusinessReady: "No", notes: "" });
  const [subcategoryForm, setSubcategoryForm] = useState({
    category: state.categories[0]?.name || "",
    name: "",
    envelopeGroup: "Lifestyle",
    envelopeStyle: "Monthly bill",
    defaultMonthlyTarget: "0",
    notes: ""
  });

  function submitCategory(event) {
    event.preventDefault();
    if (onAddCategory(categoryForm)) {
      setCategoryForm({ name: "", group: "Needs", defaultBudget: "0", taxBusinessReady: "No", notes: "" });
    }
  }

  function submitSubcategory(event) {
    event.preventDefault();
    if (onAddSubcategory(subcategoryForm)) {
      setSubcategoryForm((previous) => ({ ...previous, name: "", defaultMonthlyTarget: "0", notes: "" }));
    }
  }

  return (
    <>
      <section className="grid two">
        <Panel title="Add Category">
          <form className="form-grid" onSubmit={submitCategory}>
            <Field label="Name" className="wide"><input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} /></Field>
            <Field label="Group"><select value={categoryForm.group} onChange={(event) => setCategoryForm({ ...categoryForm, group: event.target.value })}>{categoryGroups.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Default Budget"><input type="number" step="0.01" value={categoryForm.defaultBudget} onChange={(event) => setCategoryForm({ ...categoryForm, defaultBudget: event.target.value })} /></Field>
            <Field label="Tax/Business"><select value={categoryForm.taxBusinessReady} onChange={(event) => setCategoryForm({ ...categoryForm, taxBusinessReady: event.target.value })}>{taxOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Notes" className="wide"><input value={categoryForm.notes} onChange={(event) => setCategoryForm({ ...categoryForm, notes: event.target.value })} /></Field>
            <div className="actions"><button className="primary" type="submit">Add Category</button></div>
          </form>
        </Panel>
        <Panel title="Add Subcategory">
          <form className="form-grid" onSubmit={submitSubcategory}>
            <Field label="Category"><select value={subcategoryForm.category} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, category: event.target.value })}>{state.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></Field>
            <Field label="Name" className="wide"><input value={subcategoryForm.name} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, name: event.target.value })} /></Field>
            <Field label="Envelope Group"><input value={subcategoryForm.envelopeGroup} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, envelopeGroup: event.target.value })} /></Field>
            <Field label="Style"><select value={subcategoryForm.envelopeStyle} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, envelopeStyle: event.target.value })}>{envelopeStyles.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Default Target"><input type="number" step="0.01" value={subcategoryForm.defaultMonthlyTarget} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, defaultMonthlyTarget: event.target.value })} /></Field>
            <Field label="Notes" className="wide"><input value={subcategoryForm.notes} onChange={(event) => setSubcategoryForm({ ...subcategoryForm, notes: event.target.value })} /></Field>
            <div className="actions"><button className="primary" type="submit">Add Subcategory</button></div>
          </form>
        </Panel>
      </section>
      <section className="grid two">
        <Panel title="Categories">
          <Table headers={["Name", "Group", "Default Budget", "Tax/Business", ""]}>
            {state.categories.map((item) => (
              <tr key={item.id}>
                <td><input value={item.name} onChange={(event) => onUpdateCategory(item.id, "name", event.target.value)} /></td>
                <td><select value={item.group} onChange={(event) => onUpdateCategory(item.id, "group", event.target.value)}>{categoryGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></td>
                <td><input type="number" step="0.01" value={item.defaultBudget} onChange={(event) => onUpdateCategory(item.id, "defaultBudget", event.target.value)} /></td>
                <td><select value={item.taxBusinessReady} onChange={(event) => onUpdateCategory(item.id, "taxBusinessReady", event.target.value)}>{taxOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></td>
                <td><button className="danger" type="button" onClick={() => onDeleteCategory(item.id)}>Delete</button></td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Subcategories">
          <Table headers={["Category", "Name", "Envelope Group", "Style", "Default Target", ""]}>
            {state.subcategories.map((item) => (
              <tr key={item.id}>
                <td><select value={item.category} onChange={(event) => onUpdateSubcategory(item.id, "category", event.target.value)}>{state.categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></td>
                <td><input value={item.name} onChange={(event) => onUpdateSubcategory(item.id, "name", event.target.value)} /></td>
                <td><input value={item.envelopeGroup} onChange={(event) => onUpdateSubcategory(item.id, "envelopeGroup", event.target.value)} /></td>
                <td><select value={item.envelopeStyle} onChange={(event) => onUpdateSubcategory(item.id, "envelopeStyle", event.target.value)}>{envelopeStyles.map((style) => <option key={style} value={style}>{style}</option>)}</select></td>
                <td><input type="number" step="0.01" value={item.defaultMonthlyTarget} onChange={(event) => onUpdateSubcategory(item.id, "defaultMonthlyTarget", event.target.value)} /></td>
                <td><button className="danger" type="button" onClick={() => onDeleteSubcategory(item.id)}>Delete</button></td>
              </tr>
            ))}
          </Table>
        </Panel>
      </section>
    </>
  );
}
