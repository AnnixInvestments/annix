-- Quick Database Check - What Schedules Are Available?
-- Run this in your PostgreSQL client to see what data you have

-- 1. Check what schedules exist for 500NB
SELECT 
  nod.nominal_diameter_mm as "NB (mm)",
  pd.schedule_designation as "Schedule",
  pd.schedule_number as "Sch Number",
  pd.wall_thickness_mm as "Wall Thickness (mm)",
  pd.mass_kgm as "Weight (kg/m)",
  ss.steel_spec_name as "Steel Spec"
FROM pipe_dimensions pd
JOIN nominal_outside_diameters nod ON pd.nominal_outside_diameter_id = nod.id
JOIN steel_specifications ss ON pd.steel_specification_id = ss.id
WHERE nod.nominal_diameter_mm = 500
ORDER BY pd.wall_thickness_mm;

-- 2. Check what NBs are available
SELECT DISTINCT 
  nominal_diameter_mm as "Available NB Sizes"
FROM nominal_outside_diameters 
ORDER BY nominal_diameter_mm;

-- 3. Check if you have ANY data at all
SELECT 
  (SELECT COUNT(*) FROM pipe_dimensions) as "Total Pipe Dimensions",
  (SELECT COUNT(*) FROM nominal_outside_diameters) as "Total NBs",
  (SELECT COUNT(*) FROM steel_specifications) as "Total Steel Specs",
  (SELECT COUNT(DISTINCT schedule_designation) FROM pipe_dimensions) as "Unique Schedules";

-- 4. Show a sample of what schedules exist for smaller pipes
SELECT 
  nod.nominal_diameter_mm as "NB",
  pd.schedule_designation as "Schedule"
FROM pipe_dimensions pd
JOIN nominal_outside_diameters nod ON pd.nominal_outside_diameter_id = nod.id
WHERE nod.nominal_diameter_mm IN (50, 100, 150, 200)
GROUP BY nod.nominal_diameter_mm, pd.schedule_designation
ORDER BY nod.nominal_diameter_mm, pd.schedule_designation;
