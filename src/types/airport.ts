// src/types/airport.ts

// ===== flights.csv (32 columns: 0-31) =====
// Col mapping: 0=flight_id, 1=airline, 2=airline_code, 3=origin, 4=destination,
// 5=scheduled_departure, 6=actual_departure, 7=scheduled_arrival, 8=actual_arrival,
// 9=aircraft_type, 10=aircraft_reg, 11=capacity, 12=pax_count, 13=status,
// 14=delay_minutes, 15=delay_reason, 16=terminal, 17=gate, 18=is_international,
// 19=distance_km, 20=altitude_ft, 21=boarding_time, 22=is_codeshare,
// 23=delay_category, 24=load_factor, 25=baggage_count, 26=weather_score,
// 27=time_of_day, 28=day_of_week, 29=is_holiday, 30=season, 31=route_type
export interface Flight {
  flight_id: string;
  airline: string;
  airline_code: string;
  origin: string;
  destination: string;
  scheduled_departure: string;
  actual_departure: string;
  scheduled_arrival: string;
  actual_arrival: string;
  aircraft_type: string;
  aircraft_reg: string;
  capacity: number;
  pax_count: number;
  status: 'Scheduled' | 'Boarding' | 'Departed' | 'Arrived' | 'Delayed' | 'Cancelled' | string;
  delay_minutes: number;
  delay_reason: string;
  terminal: string;
  gate: string;
  is_international: boolean;
  distance_km: number;
  altitude_ft: number;
  boarding_time: string;
  is_codeshare: boolean;
  delay_category: 'On-Time' | 'Minor' | 'Moderate' | 'Severe' | string;
  load_factor: number;
  baggage_count: number;
  weather_score: number;
  time_of_day: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | string;
  day_of_week: string;
  is_holiday: boolean;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' | string;
  route_type: 'Domestic' | 'Short-Haul Intl' | 'Long-Haul Intl' | string;
}

// ===== gate_events.csv (14 columns: 0-13) =====
// Col mapping: 0=event_id, 1=flight_id, 2=gate_id, 3=terminal, 4=event_type,
// 5=timestamp, 6=staff_id, 7=duration_minutes, 8=priority, 9=is_conflict,
// 10=conflict_details, 11=scheduled_start, 12=actual_start, 13=actual_end
export interface GateEvent {
  event_id: string;
  flight_id: string;
  gate_id: string;
  terminal: string;
  event_type: 'Boarding Start' | 'Boarding End' | 'Gate Open' | 'Gate Close' | string;
  timestamp: string;
  staff_id: string;
  duration_minutes: number;
  priority: 'Routine' | 'High' | 'Critical' | string;
  is_conflict: boolean;
  conflict_details: string;
  scheduled_start: string;
  actual_start: string;
  actual_end: string;
}

// ===== baggage.csv (18 columns: 0-17) =====
// Col mapping: 0=bag_id, 1=pnr, 2=flight_id, 3=passenger_id, 4=weight_kg,
// 5=dimensions, 6=checkin_type, 7=counter_id, 8=checkin_time, 9=scan_time,
// 10=transfer_count, 11=status, 12=is_priority, 13=damage_count, 14=location,
// 15=last_update, 16=is_fragile, 17=notes
export interface Baggage {
  bag_id: string;
  pnr: string;
  flight_id: string;
  passenger_id: string;
  weight_kg: number;
  dimensions: string;
  checkin_type: 'Check-in' | 'Self-Service' | 'Online' | string;
  counter_id: string;
  checkin_time: string;
  scan_time: string;
  transfer_count: number;
  status: 'Loaded' | 'In Transit' | 'Missing' | 'Delivered' | 'Damaged' | string;
  is_priority: boolean;
  damage_count: number;
  location: 'Ramp' | 'Belt' | 'Aircraft' | 'Terminal' | string;
  last_update: string;
  is_fragile: boolean;
  notes: string;
}

// ===== passengers.csv (28 columns: 0-27) =====
// Col mapping: 0=pnr, 1=ticket_number, 2=passenger_id, 3=first_name, 4=last_name,
// 5=nationality, 6=dob, 7=gender, 8=seat, 9=class_booked, 10=flight_id,
// 11=checkin_time, 12=boarding_time, 13=gate, 14=delay_minutes,
// 15=special_meal, 16=wheelchair, 17=unaccompanied_minor, 18=email,
// 19=phone, 20=loyalty_program, 21=loyalty_tier, 22=is_connecting,
// 23=connection_time_hrs, 24=has_lounge_access, 25=travel_class, 26=age, 27=age_category
export interface Passenger {
  pnr: string;
  ticket_number: string;
  passenger_id: string;
  first_name: string;
  last_name: string;
  nationality: string;
  dob: string;
  gender: 'M' | 'F' | string;
  seat: string;
  class_booked: 'Economy' | 'Business' | 'First' | string;
  flight_id: string;
  checkin_time: string;
  boarding_time: string;
  gate: string;
  delay_minutes: number;
  special_meal: string;
  wheelchair: string;
  unaccompanied_minor: string;
  email: string;
  phone: string;
  loyalty_program: string;
  loyalty_tier: string;
  is_connecting: boolean;
  connection_time_hrs: number;
  has_lounge_access: boolean;
  travel_class: 'Economy' | 'Business' | 'First' | string;
  age: number;
  age_category: 'Child' | 'Youth' | 'Adult' | 'Senior' | string;
}

// ===== security_screening.csv (20 columns: 0-19) =====
// Col mapping: 0=screening_id, 1=passenger_id, 2=pnr, 3=checkpoint_id,
// 4=screening_time, 5=queue_entry_time, 6=queue_exit_time, 7=result,
// 8=alert_type, 9=is_secondary, 10=staff_id, 11=scanner_id,
// 12=wait_time_seconds, 13=is_random, 14=has_prohibited, 15=shift_id,
// 16=max_queue, 17=current_queue, 18=throughput, 19=is_expedited
export interface SecurityScreening {
  screening_id: string;
  passenger_id: string;
  pnr: string;
  checkpoint_id: number;
  screening_time: string;
  queue_entry_time: string;
  queue_exit_time: string;
  result: 'Clear' | 'Alert' | 'Secondary' | string;
  alert_type: string;
  is_secondary: boolean;
  staff_id: string;
  scanner_id: string;
  wait_time_seconds: number;
  throughput: number;
  is_random: boolean;
  has_prohibited: boolean;
  shift_id: string;
  max_queue: number;
  current_queue: number;
  is_expedited: boolean;
}

// ===== maintenance_logs.csv (16 columns: 0-15) =====
// Col mapping: 0=work_order_id, 1=asset_id, 2=flight_id, 3=type,
// 4=assigned_to, 5=created_at, 6=resolved_at, 7=priority,
// 8=downtime_hours, 9=description, 10=part_replaced, 11=severity,
// 12=approved_by, 13=is_grounding, 14=is_recurring, 15=notes
export interface MaintenanceLog {
  work_order_id: string;
  asset_id: string;
  flight_id: string;
  type: 'Inspection' | 'Repair' | 'Scheduled' | 'Emergency' | string;
  assigned_to: string;
  created_at: string;
  resolved_at: string;
  priority: number;
  downtime_hours: number;
  description: string;
  part_replaced: string;
  severity: number;
  approved_by: string;
  is_grounding: boolean;
  is_recurring: boolean;
  notes: string;
}

// ===== staff_shifts.csv (15 columns: 0-14) =====
// Col mapping: 0=staff_id, 1=name, 2=department, 3=role, 4=shift_date,
// 5=shift_start, 6=shift_end, 7=terminal, 8=zone, 9=supervisor_id,
// 10=hours, 11=is_overtime, 12=break_time, 13=certification_expiry, 14=language
export interface StaffShift {
  staff_id: string;
  name: string;
  department: 'Ops' | 'Security' | 'Ground' | 'Retail' | string;
  role: 'Agent' | 'Supervisor' | 'Manager' | string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  terminal: string;
  zone: string;
  supervisor_id: string;
  hours: number;
  is_overtime: boolean;
  break_time: string;
  certification_expiry: string;
  language: string;
}

// ===== retail_transactions.csv (17 columns: 0-16) =====
// Col mapping: 0=transaction_id, 1=staff_id, 2=store_name, 3=store_type,
// 4=passenger_id, 5=flight_id, 6=timestamp, 7=product_category,
// 8=quantity, 9=amount, 10=discount, 11=payment_method, 12=currency,
// 13=loyalty_used, 14=terminal, 15=location, 16=is_duty_free
export interface RetailTransaction {
  transaction_id: string;
  staff_id: string;
  store_name: string;
  store_type: 'Retail' | 'F&B' | 'Duty Free' | string;
  passenger_id: string;
  flight_id: string;
  timestamp: string;
  product_category: string;
  quantity: number;
  amount: number;
  discount: number;
  payment_method: 'Card' | 'Cash' | 'UPI' | string;
  currency: string;
  loyalty_used: string;
  terminal: string;
  location: string;
  is_duty_free: boolean;
}

// ===== Computed / Utility Types =====
export interface GateConflict {
  gate_id: string;
  terminal: string;
  events: [GateEvent, GateEvent];
  overlap_minutes: number;
}

export interface Alert {
  id: string;
  type: 'DELAY_RISK' | 'GATE_CONFLICT' | 'BAGGAGE_MISSING' | 'MAINTENANCE_CRITICAL' | 'STAFF_SHORTAGE' | 'SECURITY_QUEUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  flight_id?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface TerminalSummary {
  terminal: string;
  flightCount: number;
  paxCount: number;
  onTimeRate: number;
  securityAvgWait: number;
  activeGates: number;
  revenue: number;
}

export interface BaggageSummary {
  totalBags: number;
  loadedPercent: number;
  missingCount: number;
  damagedCount: number;
  avgWeight: number;
}

export interface SecurityHeatmapEntry {
  hour: number;
  checkpoint: number;
  avgWaitSeconds: number;
  throughput: number;
}

export interface StaffingGap {
  timeSlot: string;
  department: string;
  terminal: string;
  assigned: number;
  required: number;
  status: 'OK' | 'LOW' | 'CRITICAL';
}

export interface MaintenanceSummary {
  openCritical: number;
  openHigh: number;
  openMedium: number;
  openLow: number;
  totalOpen: number;
  groundingItems: number;
}

export interface RetailSummary {
  totalRevenue: number;
  avgTransaction: number;
  topCategory: string;
  peakHour: number;
  totalTransactions: number;
}

// Column name mappings for CSV parsing (numeric headers -> field names)
export const COLUMN_MAPS = {
  flights: ['flight_id', 'airline', 'airline_code', 'origin', 'destination', 'scheduled_departure', 'actual_departure', 'scheduled_arrival', 'actual_arrival', 'aircraft_type', 'aircraft_reg', 'capacity', 'pax_count', 'status', 'delay_minutes', 'delay_reason', 'terminal', 'gate', 'is_international', 'distance_km', 'altitude_ft', 'boarding_time', 'is_codeshare', 'delay_category', 'load_factor', 'baggage_count', 'weather_score', 'time_of_day', 'day_of_week', 'is_holiday', 'season', 'route_type'],
  gate_events: ['event_id', 'flight_id', 'gate_id', 'terminal', 'event_type', 'timestamp', 'staff_id', 'duration_minutes', 'priority', 'is_conflict', 'conflict_details', 'scheduled_start', 'actual_start', 'actual_end'],
  baggage: ['bag_id', 'pnr', 'flight_id', 'passenger_id', 'weight_kg', 'dimensions', 'checkin_type', 'counter_id', 'checkin_time', 'scan_time', 'transfer_count', 'status', 'is_priority', 'damage_count', 'location', 'last_update', 'is_fragile', 'notes'],
  passengers: ['pnr', 'ticket_number', 'passenger_id', 'first_name', 'last_name', 'nationality', 'dob', 'gender', 'seat', 'class_booked', 'flight_id', 'checkin_time', 'boarding_time', 'gate', 'delay_minutes', 'special_meal', 'wheelchair', 'unaccompanied_minor', 'email', 'phone', 'loyalty_program', 'loyalty_tier', 'is_connecting', 'connection_time_hrs', 'has_lounge_access', 'travel_class', 'age', 'age_category'],
  security_screening: ['screening_id', 'passenger_id', 'pnr', 'checkpoint_id', 'screening_time', 'queue_entry_time', 'queue_exit_time', 'result', 'alert_type', 'is_secondary', 'staff_id', 'scanner_id', 'wait_time_seconds', 'is_random', 'has_prohibited', 'shift_id', 'max_queue', 'current_queue', 'throughput', 'is_expedited'],
  maintenance_logs: ['work_order_id', 'asset_id', 'flight_id', 'type', 'assigned_to', 'created_at', 'resolved_at', 'priority', 'downtime_hours', 'description', 'part_replaced', 'severity', 'approved_by', 'is_grounding', 'is_recurring', 'notes'],
  staff_shifts: ['staff_id', 'name', 'department', 'role', 'shift_date', 'shift_start', 'shift_end', 'terminal', 'zone', 'supervisor_id', 'hours', 'is_overtime', 'break_time', 'certification_expiry', 'language'],
  retail_transactions: ['transaction_id', 'staff_id', 'store_name', 'store_type', 'passenger_id', 'flight_id', 'timestamp', 'product_category', 'quantity', 'amount', 'discount', 'payment_method', 'currency', 'loyalty_used', 'terminal', 'location', 'is_duty_free'],
} as const;
