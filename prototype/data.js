// Seed data for the prototype. Dates are relative to "now" so the dashboard always has a recent week.
(function () {
  function ago(days, hh, mm) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  }

  const users = [
    { id: "U01", name: "สุภาพร ใจดี", email: "admin@plant.local", role: "admin", active: true },
    { id: "U02", name: "ธนากร ศรีสุข", email: "tech1@plant.local", role: "technician", active: true },
    { id: "U03", name: "วรเชษฐ์ บุญมา", email: "tech2@plant.local", role: "technician", active: true },
    { id: "U04", name: "ณัฐชา แก้วใส", email: "manager@plant.local", role: "viewer", active: true },
  ];

  const machines = [
    { id: "M-001", name: "CNC Lathe #1", type: "CNC", location: "Line A", status: "Running" },
    { id: "M-002", name: "CNC Milling #2", type: "CNC", location: "Line A", status: "Alarm" },
    { id: "M-003", name: "Belt Conveyor C1", type: "Conveyor", location: "Line A", status: "Running" },
    { id: "M-004", name: "Robot Arm R1 (Welding)", type: "Robot", location: "Line B", status: "Running" },
    { id: "M-005", name: "Robot Arm R2 (Pick & Place)", type: "Robot", location: "Line B", status: "Maintenance" },
    { id: "M-006", name: "Hydraulic Press 200T", type: "Press", location: "Line B", status: "Running" },
    { id: "M-007", name: "Injection Molding IM-450", type: "Injection Molding", location: "Line C", status: "Alarm" },
    { id: "M-008", name: "Packaging Sealer PK-2", type: "Packaging", location: "Line C", status: "Stop" },
    { id: "M-009", name: "Air Compressor AC-75", type: "Compressor", location: "Utility", status: "Running" },
    { id: "M-010", name: "Chiller CH-30", type: "Chiller", location: "Utility", status: "Running" },
  ];

  const alarms = [
    { id: "ALM-1024", machineId: "M-002", code: "E-201", description: "Spindle overload", occurredAt: ago(0, 9, 12), cause: "", action: "", status: "Open" },
    { id: "ALM-1023", machineId: "M-007", code: "E-410", description: "Barrel temperature high (Zone 3)", occurredAt: ago(0, 7, 48), cause: "Heater band thermocouple drift", action: "", status: "In Progress", assignee: "U02" },
    { id: "ALM-1022", machineId: "M-005", code: "E-305", description: "Gripper vacuum pressure low", occurredAt: ago(1, 14, 5), cause: "Vacuum cup worn", action: "", status: "In Progress", assignee: "U03" },
    { id: "ALM-1021", machineId: "M-003", code: "E-102", description: "Belt misalignment sensor", occurredAt: ago(1, 10, 30), cause: "Tail pulley loose", action: "Re-tensioned belt and tightened pulley bolts", status: "Closed", closedAt: ago(1, 11, 25), closedBy: "U02" },
    { id: "ALM-1020", machineId: "M-008", code: "E-512", description: "Seal jaw temperature not reached", occurredAt: ago(2, 16, 40), cause: "", action: "", status: "Open" },
    { id: "ALM-1019", machineId: "M-002", code: "E-203", description: "Coolant level low", occurredAt: ago(2, 8, 15), cause: "Coolant consumption", action: "Refilled coolant tank, checked for leaks", status: "Closed", closedAt: ago(2, 8, 50), closedBy: "U03" },
    { id: "ALM-1018", machineId: "M-004", code: "E-301", description: "Collision detected Axis J3", occurredAt: ago(3, 13, 22), cause: "Fixture not seated", action: "Re-seated fixture, re-taught point P12", status: "Closed", closedAt: ago(3, 14, 40), closedBy: "U02" },
    { id: "ALM-1017", machineId: "M-007", code: "E-402", description: "Hydraulic oil pressure low", occurredAt: ago(3, 9, 5), cause: "Filter clogged", action: "Replaced return-line filter", status: "Closed", closedAt: ago(3, 11, 0), closedBy: "U03" },
    { id: "ALM-1016", machineId: "M-009", code: "E-601", description: "Discharge temperature high", occurredAt: ago(4, 15, 10), cause: "Cooler fins dusty", action: "Cleaned cooler fins", status: "Closed", closedAt: ago(4, 15, 55), closedBy: "U02" },
    { id: "ALM-1015", machineId: "M-006", code: "E-350", description: "Light curtain interrupted", occurredAt: ago(5, 11, 45), cause: "Operator reach-in", action: "Reset, briefed operator on procedure", status: "Closed", closedAt: ago(5, 11, 58), closedBy: "U03" },
    { id: "ALM-1014", machineId: "M-002", code: "E-201", description: "Spindle overload", occurredAt: ago(5, 8, 20), cause: "Dull cutting tool", action: "Replaced insert T04", status: "Closed", closedAt: ago(5, 9, 10), closedBy: "U02" },
    { id: "ALM-1013", machineId: "M-007", code: "E-410", description: "Barrel temperature high (Zone 3)", occurredAt: ago(6, 14, 0), cause: "Setpoint error", action: "Corrected recipe setpoint", status: "Closed", closedAt: ago(6, 14, 35), closedBy: "U03" },
    { id: "ALM-1012", machineId: "M-001", code: "E-205", description: "Door interlock open during cycle", occurredAt: ago(6, 10, 10), cause: "Switch actuator bent", action: "Replaced door switch actuator", status: "Closed", closedAt: ago(6, 12, 0), closedBy: "U02" },
  ];

  const maintenance = [
    { id: "MNT-0312", machineId: "M-005", technicianId: "U03", type: "Corrective", problem: "Gripper vacuum pressure low", action: "Ordered replacement vacuum cups (x4)", date: ago(0, 8, 30), status: "Waiting Part", alarmId: "ALM-1022" },
    { id: "MNT-0311", machineId: "M-007", technicianId: "U02", type: "Corrective", problem: "Zone 3 over-temperature", action: "Checking thermocouple and heater band", date: ago(0, 8, 0), status: "In Progress", alarmId: "ALM-1023" },
    { id: "MNT-0310", machineId: "M-006", technicianId: "U03", type: "Preventive", problem: "Monthly PM: hydraulic press", action: "", date: ago(-2, 9, 0), status: "Open" },
    { id: "MNT-0309", machineId: "M-003", technicianId: "U02", type: "Corrective", problem: "Belt misalignment", action: "Re-tensioned belt and tightened pulley bolts", date: ago(1, 10, 45), status: "Done", alarmId: "ALM-1021" },
    { id: "MNT-0308", machineId: "M-007", technicianId: "U03", type: "Corrective", problem: "Hydraulic oil pressure low", action: "Replaced return-line filter", date: ago(3, 9, 20), status: "Done", alarmId: "ALM-1017" },
    { id: "MNT-0307", machineId: "M-004", technicianId: "U02", type: "Corrective", problem: "Collision J3", action: "Re-seated fixture, re-taught P12", date: ago(3, 13, 40), status: "Done", alarmId: "ALM-1018" },
    { id: "MNT-0306", machineId: "M-009", technicianId: "U02", type: "Preventive", problem: "Quarterly PM: compressor", action: "Changed oil, air filter, checked belts", date: ago(4, 13, 0), status: "Done" },
    { id: "MNT-0305", machineId: "M-001", technicianId: "U02", type: "Corrective", problem: "Door interlock fault", action: "Replaced door switch actuator", date: ago(6, 10, 20), status: "Done", alarmId: "ALM-1012" },
  ];

  // Preventive maintenance plans. Dates are local YYYY-MM-DD; negative offset = future.
  function day(offset) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  const pmPlans = [
    { id: "PM-001", machineId: "M-006", task: "Monthly PM เครื่องอัดไฮดรอลิก", checklist: "เปลี่ยนไส้กรองน้ำมันไฮดรอลิก\nตรวจแรงดันระบบ 180–200 bar\nตรวจรอยรั่วที่ข้อต่อ", intervalDays: 30, technicianId: "U03", lastDone: day(28), nextDue: day(-2), active: true },
    { id: "PM-002", machineId: "M-009", task: "Quarterly PM ปั๊มลม", checklist: "เปลี่ยนน้ำมันคอมเพรสเซอร์\nเปลี่ยนไส้กรองอากาศ\nตรวจความตึงสายพาน", intervalDays: 90, technicianId: "U02", lastDone: day(4), nextDue: day(-86), active: true },
    { id: "PM-003", machineId: "M-001", task: "หล่อลื่น Slideway และตรวจ Backlash", checklist: "เติมน้ำมัน slideway\nวัด backlash แกน X/Z ไม่เกิน 0.01 mm\nทำความสะอาดถาดเศษ", intervalDays: 30, technicianId: "U02", lastDone: day(33), nextDue: day(3), active: true },
    { id: "PM-004", machineId: "M-004", task: "ตรวจสายเคเบิลและอัดจาระบี Reducer", checklist: "ตรวจ cable dress ทุกแกน\nอัดจาระบี reducer J1–J3\nสำรองโปรแกรมหุ่นยนต์", intervalDays: 90, technicianId: "U02", lastDone: day(85), nextDue: day(-5), active: true },
    { id: "PM-005", machineId: "M-003", task: "ตรวจสายพานและ Bearing", checklist: "ตรวจความตึงและแนวสายพาน\nฟังเสียง bearing ลูกกลิ้ง\nทำความสะอาดเซนเซอร์", intervalDays: 7, technicianId: "U03", lastDone: day(6), nextDue: day(-1), active: true },
    { id: "PM-006", machineId: "M-010", task: "ล้าง Condenser Coil", checklist: "ล้าง condenser coil\nตรวจระดับน้ำยา\nบันทึกอุณหภูมิน้ำเข้า/ออก", intervalDays: 180, technicianId: "U03", lastDone: day(160), nextDue: day(-20), active: true },
    { id: "PM-007", machineId: "M-007", task: "ตรวจ Heater Band และ Thermocouple", checklist: "วัดความต้านทาน heater ทุกโซน\nสอบเทียบ thermocouple\nขันขั้วสายไฟ", intervalDays: 30, technicianId: "U02", lastDone: day(31), nextDue: day(1), active: true },
    { id: "PM-008", machineId: "M-008", task: "เปลี่ยน Teflon Seal Jaw", checklist: "เปลี่ยนเทปเทฟลอน seal jaw\nตรวจแรงกดปิดผนึก", intervalDays: 30, technicianId: "U03", lastDone: day(18), nextDue: day(-12), active: true },
    { id: "PM-009", machineId: "M-002", task: "เปลี่ยน Coolant และล้างถัง", checklist: "ดูดเศษและล้างถัง coolant\nผสม coolant ใหม่ 5–7%\nตรวจปั๊ม coolant", intervalDays: 30, technicianId: "U03", lastDone: day(21), nextDue: day(-9), active: true },
  ];
  maintenance.find(r => r.id === "MNT-0310").planId = "PM-001";
  maintenance.find(r => r.id === "MNT-0306").planId = "PM-002";

  const audit = [
    { at: ago(0, 8, 31), userId: "U03", text: "เปลี่ยนสถานะ MNT-0312 เป็น Waiting Part" },
    { at: ago(0, 8, 1), userId: "U02", text: "รับงาน ALM-1023 และเปลี่ยนเป็น In Progress" },
    { at: ago(1, 11, 25), userId: "U02", text: "ปิด ALM-1021" },
    { at: ago(2, 9, 0), userId: "U01", text: "แก้ไขข้อมูลเครื่อง M-010 (Location)" },
  ];

  window.SEED = { users, machines, alarms, maintenance, pmPlans, audit };
})();
