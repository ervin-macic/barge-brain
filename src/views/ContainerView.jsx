import { useState, useRef } from "react";
import { theme } from "../data/theme";
import { PORT_LABELS } from "../data/constants";
import { CONTAINERS_RAW } from "../data/containersRaw";

//import fs from "fs";
//import path from "path";
//import { fileURLToPath } from "url";
//import initSqlJs from "sql.js";
//
//const __dirname = path.dirname(fileURLToPath(import.meta.url));
//const root = path.join(__dirname, "..");
//const dbFile = path.join(root, "legacy/barge_data.sqlite");

const columns = [
	//common:
	{ label: "CNTR", shortlabel: "CNTR", key: "cntr" },
	{ label: "BOOKING", shortlabel: "BOOKING", key: "booking" },
	{ label: "ADDRESS_SHIPCOM", shortlabel: "ADDRESS_SHIPCOM", key: "address_shipcom" },
	{ label: "CNTRSTATUS", shortlabel: "STATUS", key: "cntrstatus" },
	{ label: "ADDRESS_INL", shortlabel: "ADDRESS_INL", key: "address_inl" },
	{ label: "INLTIME", shortlabel: "INLTIME", key: "inltime" },
	{ label: "INLDATE", shortlabel: "INLDATE", key: "inldate" },
	{ label: "UNITTYPE", shortlabel: "UNITTYPE", key: "unittype" },
	//dfUnitImp:
	{ label: "VOYAGE_IMP", shortlabel: "VOYAGE_IMP", key: "voyage_imp" },
	{ label: "ADDRESS_IMP", shortlabel: "ADDRESS_IMP", key: "address_imp" },
	{ label: "MS_EX", shortlabel: "MS_EX", key: "ms_ex" },
	{ label: "PUDATE", shortlabel: "PUDATE", key: "pudate" },
	{ label: "PUTIME", shortlabel: "PUTIME", key: "putime" },
	{ label: "LATESTPUDATE", shortlabel: "LATESTPUDATE", key: "latestpudate" },
	{ label: "LATESTPUTIME", shortlabel: "LATESTPUTIME", key: "latestputime" },
	{ label: "ARRDATE", shortlabel: "ARRDATE", key: "arrdate" },
	{ label: "ARRTIME", shortlabel: "ARRTIME", key: "arrtime" },
	{ label: "FULL_IMP", shortlabel: "FULL_IMP", key: "full_imp" },
	{ label: "NETT", shortlabel: "NETT", key: "nett" },
	{ label: "CRTYPE", shortlabel: "CRTYPE", key: "crtype" },

	{ label: "PRESENTIMPORT", shortlabel: "PRESENT", key: "presentimport" },
	{ label: "RELEASEDIMPORT", shortlabel: "RELEASED", key: "releasedimport" },
	{ label: "CUSTOMSCLEAREDIMPORT", shortlabel: "CLEARED", key: "customsclearedimport" },
	{ label: "BLOCKEDIMPORT", shortlabel: "BLOCKED", key: "blockedimport" },
	{ label: "OTHERISSUEIMPORT", shortlabel: "OTHERISSUE", key: "otherissueimport" },
	//dfUnitExp:
	{ label: "VOYAGE_EXP", shortlabel: "VOYAGE_EXP", key: "voyage_exp" },
	{ label: "ADDRESS_EXP", shortlabel: "ADDRESS_EXP", key: "address_exp" },
	{ label: "DEPDATE", shortlabel: "DEPDATE", key: "depdate" },
	{ label: "DEPTIME", shortlabel: "DEPTIME", key: "deptime" },
	{ label: "FIRSTDELDATE", shortlabel: "FIRSTDELDATE", key: "firstdeldate" },
	{ label: "FIRSTDELTIME", shortlabel: "FIRSTDELTIME", key: "firstdeltime" },
	{ label: "DELDATE", shortlabel: "DELDATE", key: "deldate" },
	{ label: "DELTIME", shortlabel: "DELTIME", key: "deltime" },
	{ label: "FULL_EXP", shortlabel: "FULL_EXP", key: "full_exp" },

	{ label: "CORRECTORDEREXPORT", shortlabel: "CORRECTORDER", key: "correctorderexport" },
	{ label: "CUSTOMDOCAVAILABLEEXPORT", shortlabel: "DOCAVAILEBLE", key: "customdocavailableexport" },
	{ label: "BLOCKEDEXPORT", shortlabel: "BLOCKED", key: "blockedexport" },
	{ label: "BEFORECARGOOPENINGEXPORT", shortlabel: "BEFORECARGOOPENING", key: "beforecargoopeningexport" },
	{ label: "OTHERISSUEEXPORT", shortlabel: "OTHERISSUE", key: "otherissueexport" },
];

const DIROPTIONS = [
	{value: "all", label: "All"},
	{value: "imp", label: "Import"},
	{value: "exp", label: "Export"},
];

function FilterControls({filters, onFilterChange}){
	const inlTerm = [];
	const expTerm = [];
	const impTerm = [];
	const shipcomTerm = [];
	return (
		<aside
			style={{
				width: 240,
				flexShrink: 0,
				background: theme.bgSecondary,
				borderRight: `1px solid ${theme.border}`,
				padding: theme.space.lg,
				display: "flex",
				flex: 0,
				flexDirection: "column",
				gap: theme.space.xl,
			}}
		>
		{/* import/export filter */}
			<section>
			<h3
			style={{
				fontSize: 11,
					fontWeight: 600,
					color: theme.textSecondary,
					textTransform: "uppercase",
					letterSpacing: 1,
					margin: "0 0 10px",
			}}
			>
			Direction
			</h3>
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
			{DIROPTIONS.map((opt) => (
				<label
				key={opt.value}
				style={{
					display: "flex",
						alignItems: "center",
						gap: 8,
						cursor: "pointer",
						fontSize: 13,
						color: theme.textPrimary,
				}}
				>
				<input
				type="radio"
				name="direction"
				value={opt.value}
				checked={filters.direction === opt.value}
				onChange={() => onFilterChange("direction", opt.value)}
				style={{ accentColor: theme.accent }}
				/>
				{opt.label}
				</label>
			))}
			</div>
			</section>
		{/* Inland Terminal filter * /}
			<section>
			<h3
			style={{
				fontSize: 11,
					fontWeight: 600,
					color: theme.textSecondary,
					textTransform: "uppercase",
					letterSpacing: 1,
					margin: "0 0 10px",
			}}
			>
			Inland Terminal
			</h3>
			<select
			value={filters.inlterm}
			onChange={(e) => onFilterChange("inlterm", e.target.value)}
			style={{
				width: "100%",
					padding: "8px 10px",
					borderRadius: theme.radius.md,
					border: `1px solid ${theme.border}`,
					background: theme.bgPrimary,
					fontSize: 13,
					color: theme.textPrimary,
					cursor: "pointer",
			}}
			>
			<option value="all">All inland terminals</option>
			{inlTerm.map((t) => (
				<option key={t} value={t}>
				{PORT_LABELS[t] || t}
				</option>
			))}
			</select>
			</section>
		{/* */}

		</aside>
	);
}

function ContainerTableRow({container}){
	//one <td> per data point
	return (<tr style={{
			background: theme.bgSecondary,
			border: `1px solid ${theme.borderMuted}`,
			borderRadius: theme.radius.lg,
			overflow: "hidden",
			boxShadow: theme.shadowSm,
			
			gap: theme.space.xl
		}}>
			{columns.map(({key}) => {
				return (<td style={{borderRight: `1px solid ${theme.border}`, alignItems: "center", justifyContent: 'center',}}>{container[key]}</td>);
		})}
		</tr>);
}

function ContainerTable({filters}){
	return (<div style={{display: "flex", flex: 1, overflow: "scroll"}}>
			<table 
				style={{
					display: "",
					background: theme.bgPrimary,
					border: `1px solid ${theme.borderMuted}`,
					borderRadius: theme.radius.lg,
					overflow: "hidden",
					boxShadow: theme.shadowSm,
					gap: theme.space.xl
				}}>
			<thead> 
				{columns.map(({label, shortlabel}) => {
					return (<th>{shortlabel}</th>);
				})}
			</thead>
			{CONTAINERS_RAW.exp.map((container) => { if (filters.direction === "exp" || filters.direction === "all")  return (<ContainerTableRow container={container} />); })}
			{CONTAINERS_RAW.imp.map((container) => { if (filters.direction === "imp" || filters.direction === "all")  return (<ContainerTableRow container={container} />); })}
			</table>
		</div>
	);
}

export default function ContainerView() {
	const [filters, setFilters] = useState({
		direction: "all",
		inlterm: "all",
		expterm: "all",
		shipcomterm: "all",
	});

	const handleFilterChange = (key, value) => {
		setFilters((f) => ({ ...f, [key]: value }));
	};
	return ( <div style={{
			display: "flex", 
			flexDirection: "row",
			background: theme.bgSecondary,
			border: `1px solid ${theme.borderMuted}`,
			borderRadius: theme.radius.lg,
			overflow: "hidden",
			boxShadow: theme.shadowSm,
			gap: theme.space.xl
		}}> 
			<FilterControls filters={filters} onFilterChange={handleFilterChange} />
			<ContainerTable filters={filters} /> 
		</div> );
}

