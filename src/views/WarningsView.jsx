import { EmptyState, Panel, StatusPill, Table } from "../components/ui.jsx";

export function WarningsView({ warnings }) {
  return (
    <Panel title="Status Warnings" subtitle={warnings.length ? `${warnings.length} issue(s) found.` : "No issues for the selected month."}>
      {warnings.length ? (
        <Table headers={["Severity", "Code", "Message", "Entity"]}>
          {warnings.map((item, index) => (
            <tr key={`${item.code}-${item.entityId || index}`}>
              <td><StatusPill tone={item.severity}>{item.severity}</StatusPill></td>
              <td>{item.code}</td>
              <td>{item.message}</td>
              <td>{item.entityId || ""}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No warnings" message="Your selected month looks clean." />
      )}
    </Panel>
  );
}
