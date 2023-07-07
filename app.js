const express = require("express");
const app = express();

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");

app.use(express.json());

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndRunServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DE Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndRunServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateName: dbObject.state_name,
    population: dbObject.population,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const stateNames = `
    SELECT * FROM state
    ORDER BY
    state_id;
    `;
  const allStatesArray = await db.all(stateNames);
  response.send(
    allStatesArray.map((eachObject) =>
      convertDbObjectToResponseObject(eachObject)
    )
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};`;
  const stateDetails = await db.get(stateQuery);
  response.send(convertDbObjectToResponseObject(stateDetails));
});

//adding new district

app.post("/districts/", async (request, response) => {
  const newDistrict = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = newDistrict;

  const addingNewDistrict = `
    INSERT INTO
    district (district_name, state_id,cases, cured, active, deaths)
    VALUES(
        '${districtName}',
         '${stateId}',
         '${cases}',
         '${cured}',
         '${active}',
         '${deaths}')`;

  const dbResponse = await db.run(addingNewDistrict);
  const newDistrictDetails = dbResponse.lastID;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = `
    SELECT * FROM district WHERE district_id = ${districtId};`;
  const districtArray = await db.get(districtDetails);
  response.send(convertDbObjectToResponseObject(districtArray));
});

//removing district from district table
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistrict = `
    DELETE FROM district
    WHERE district_id = ${districtId};`;

  await db.run(removeDistrict);
  response.send("District Removed");
});

//API 6 Update the district details
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;

  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictDetails = `
    UPDATE district
    SET
    district_name = '${districtName}',
    state_id = '${stateId}',
    cases= '${cases}', 
    cured = '${cured}',
    active = '${active}',
    deaths = '${deaths}'
    WHERE district_id = ${districtId};`;
  await db.run(updateDistrictDetails);
  console.log(updateDistrictDetails);
  response.send("District Details Updated");
});

//API 7  Getting Statistics
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district
    WHERE state_id = ${stateId};
    `;
  const stateDetails = await db.get(stateQuery);

  response.send({
    totalCases: stateDetails["SUM(cases)"],
    totalCured: stateDetails["SUM(cured)"],
    totalActive: stateDetails["SUM(active)"],
    totalDeaths: stateDetails["SUM(deaths)"],
  });
});

//API 8  Getting State Name
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `
    SELECT state_name
    FROM state
    NATURAL JOIN district 
    WHERE district_id = ${districtId};
    `;
  const stateName = await db.get(stateQuery);
  response.send(convertDbObjectToResponseObject(stateName));
});
module.exports = app;
