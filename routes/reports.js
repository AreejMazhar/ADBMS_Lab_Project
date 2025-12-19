const express = require('express');
const router = express.Router();

// Import all models used for reporting
const Pet = require('../models/Pet');
const Adoption = require('../models/AdoptionRecord');
const Adopter = require('../models/Adopter');
const MedicalRecord = require('../models/MedicalRecord');

router.get('/', async (req, res) => {
  try {

    /* =====================
       BASIC COUNTS
       ===================== */

    // Total number of pets in the system
    const totalPets = await Pet.countDocuments();

    // Total registered adopters
    const totalAdopters = await Adopter.countDocuments();

    // Total adoption records
    const totalAdoptions = await Adoption.countDocuments();

    // Adoption success rate (percentage)
    // Avoid division by zero
    const successRate = totalPets === 0
      ? 0
      : Math.round((totalAdoptions / totalPets) * 100);

    /* =====================
       TOP ADOPTERS
       ===================== */

    const topAdoptersRaw = await Adoption.aggregate([
      {
        // $group:
        // Groups multiple adoption documents into one per adopter
        $group: {
          _id: "$adopter_id",          // group key
          adoptions: { $sum: 1 },      // count adoptions per adopter
          lastAdoption: { $max: "$adoption_date" } // most recent date
        }
      },
      {
        // $sort:
        // Sort adopters by number of adoptions (descending)
        $sort: { adoptions: -1 }
      },
      {
        // $limit:
        // Only return the top 5 adopters
        $limit: 5
      }
    ]);

    // Fetch adopter names for display
    const topAdopters = await Promise.all(
      topAdoptersRaw.map(async a => {
        const adopter = await Adopter.findOne({ adopter_id: a._id });
        return {
          name: adopter ? adopter.name : "Unknown",
          adoptions: a.adoptions,
          lastAdoption: a.lastAdoption
        };
      })
    );

    /* =====================
       SPECIES ADOPTION STATS
       ===================== */

    const speciesStats = await Adoption.aggregate([
      {
        // $lookup:
        // Joins Adoption collection with Pet collection
        // Similar to SQL JOIN
        $lookup: {
          from: "pets",            // MongoDB collection name
          localField: "pet_id",    // field in Adoption
          foreignField: "pet_id",  // field in Pet
          as: "pet"                // output array field
        }
      },
      {
        // $unwind:
        // Converts pet array into a single object
        // Required to access pet fields directly
        $unwind: "$pet"
      },
      {
        // $group:
        // Groups by pet species and counts adoptions
        $group: {
          _id: "$pet.species",
          count: { $sum: 1 }
        }
      },
      {
        // Sort species by adoption count
        $sort: { count: -1 }
      }
    ]);

    // Get all species for dropdown filter
    const speciesList = await Pet.distinct("species");

    // Selected species from query string
    const selectedSpecies = req.query.species || "All";

    /* =====================
       MONTHLY ADOPTIONS
       ===================== */

    const allMonthlyAdoptions = await Adoption.aggregate([
      {
        // $group by year and month extracted from adoption_date
        $group: {
          _id: {
            year: { $year: "$adoption_date" },
            month: { $month: "$adoption_date" }
          },
          count: { $sum: 1 }
        }
      },
      {
        // Sort chronologically
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Convert aggregation output into chart-friendly structure
    const monthlyDataByYear = {};
    allMonthlyAdoptions.forEach(m => {
      const y = m._id.year;
      const mo = m._id.month;
      if (!monthlyDataByYear[y]) monthlyDataByYear[y] = Array(12).fill(0);
      monthlyDataByYear[y][mo - 1] = m.count;
    });

    /* =====================
       AGE GROUP ADOPTIONS
       ===================== */

    const ageGroupDataRaw = await Adoption.aggregate([
      {
        // Join pets to get age information
        $lookup: {
          from: "pets",
          localField: "pet_id",
          foreignField: "pet_id",
          as: "pet"
        }
      },
      { $unwind: "$pet" },

      {
        // $match:
        // Filters documents (like WHERE in SQL)
        $match: { "pet.age": { $gte: 0 } }
      },
      {
        // $addFields:
        // Adds a computed field to each document
        $addFields: {
          ageGroup: {
            // $switch:
            // Conditional logic inside aggregation
            $switch: {
              branches: [
                {
                  case: { $lte: ["$pet.age", 24] },
                  then: "Young"
                },
                {
                  case: {
                    $and: [
                      { $gt: ["$pet.age", 24] },
                      { $lte: ["$pet.age", 84] }
                    ]
                  },
                  then: "Adult"
                }
              ],
              default: "Senior"
            }
          }
        }
      },
      {
        // Group by computed ageGroup
        $group: {
          _id: "$ageGroup",
          count: { $sum: 1 }
        }
      },
      {
        // Add custom sort order for chart consistency
        $addFields: {
          sortOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "Young"] }, then: 1 },
                { case: { $eq: ["$_id", "Adult"] }, then: 2 },
                { case: { $eq: ["$_id", "Senior"] }, then: 3 }
              ],
              default: 4
            }
          }
        }
      },
      { $sort: { sortOrder: 1 } }
    ]);

    // Ensure all age groups appear even if zero
    const ageGroupLabels = ["Young", "Adult", "Senior"];
    const ageGroupCounts = ageGroupLabels.map(g =>
      ageGroupDataRaw.find(a => a._id === g)?.count || 0
    );

    /* =====================
       VACCINATION COVERAGE
       ===================== */

    const vaccinationDataRaw = await MedicalRecord.aggregate([
      {
        // Only vaccination records
        $match: { type: 'Vaccination' }
      },
      {
        // Count per vaccination type
        $group: {
          _id: '$vaccination_name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const vaccinationLabels = vaccinationDataRaw.map(v => v._id);
    const vaccinationCounts = vaccinationDataRaw.map(v => v.count);

    /* =====================
       COMMON DIAGNOSES
       ===================== */

    const diagnosisDataRaw = await MedicalRecord.aggregate([
      {
        // Only checkups with a diagnosis
        $match: {
          type: 'Check-up',
          diagnosis: { $exists: true }
        }
      },
      {
        // Count frequency of diagnoses
        $group: {
          _id: '$diagnosis',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const diagnosisLabels = diagnosisDataRaw.map(d => d._id);
    const diagnosisCounts = diagnosisDataRaw.map(d => d.count);

    /* =====================
       BREED POPULARITY
       ===================== */

    const breedBySpeciesRaw = await Adoption.aggregate([
      {
        // Join pets to access species and breed
        $lookup: {
          from: "pets",
          localField: "pet_id",
          foreignField: "pet_id",
          as: "pet"
        }
      },
      { $unwind: "$pet" },
      {
        // Count adoptions per breed per species
        $group: {
          _id: {
            species: "$pet.species",
            breed: "$pet.breed"
          },
          count: { $sum: 1 }
        }
      },
      {
        // Group breeds under each species
        $group: {
          _id: "$_id.species",
          breeds: {
            // push -> collects breed and count into an array
            $push: {
              breed: "$_id.breed",
              count: "$count"
            }
          }
        }
      }
    ]);

    // Convert aggregation result to object for easy access
    const breedBySpecies = {};
    breedBySpeciesRaw.forEach(s => {
      breedBySpecies[s._id] = s.breeds;
    });

    // Render reports page with all analytics
    res.render('reports', {
      page: 'reports',
      totalPets,
      totalAdopters,
      totalAdoptions,
      successRate,
      topAdopters,
      speciesStats,
      monthlyDataByYear,
      ageGroupLabels,
      ageGroupCounts,
      vaccinationLabels,
      vaccinationCounts,
      diagnosisLabels,
      diagnosisCounts,
      speciesList,
      selectedSpecies,
      breedBySpecies
    });

  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
