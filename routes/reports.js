const express = require('express');
const router = express.Router();

const Pet = require('../models/Pet');
const Adoption = require('../models/AdoptionRecord');
const Adopter = require('../models/Adopter');
const MedicalRecord = require('../models/MedicalRecord');

router.get('/', async (req, res) => {
  try {
    /* =====================
       Basic Counts
    ====================== */
    const totalPets = await Pet.countDocuments();
    const totalAdopters = await Adopter.countDocuments();
    const totalAdoptions = await Adoption.countDocuments();

    const adoptedCount = await Pet.countDocuments({ available: false });

    const successRate = totalPets === 0
        ? 0
        : Math.round((adoptedCount / totalPets) * 100);

    /* =====================
       Top Adopters
    ====================== */
    const topAdoptersRaw = await Adoption.aggregate([
      { $group: { _id: "$adopter_id", adoptions: { $sum: 1 }, lastAdoption: { $max: "$adoption_date" } } },
      { $sort: { adoptions: -1 } },
      { $limit: 5 }
    ]);

    const topAdopters = await Promise.all(
      topAdoptersRaw.map(async a => {
        const adopter = await Adopter.findOne({ adopter_id: a._id });
        return { name: adopter ? adopter.name : "Unknown", adoptions: a.adoptions, lastAdoption: a.lastAdoption };
      })
    );

    /* =====================
       Species Stats
    ====================== */
    const speciesStats = await Adoption.aggregate([
      { $lookup: { from: "pets", localField: "pet_id", foreignField: "pet_id", as: "pet" } },
      { $unwind: "$pet" },
      { $group: { _id: "$pet.species", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const speciesList = await Pet.distinct("species");
    const selectedSpecies = req.query.species || speciesList[0];

    /* =====================
       Monthly Adoptions
    ====================== */
    const allMonthlyAdoptions = await Adoption.aggregate([
      { $group: { _id: { year: { $year: "$adoption_date" }, month: { $month: "$adoption_date" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthlyDataByYear = {};
    allMonthlyAdoptions.forEach(m => {
      const y = m._id.year;
      const mo = m._id.month;
      if (!monthlyDataByYear[y]) monthlyDataByYear[y] = Array(12).fill(0);
      monthlyDataByYear[y][mo-1] = m.count;
    });

    /* =====================
       Age Group Adoption Chart
    ====================== */
    const ageGroupDataRaw = await Adoption.aggregate([
      { $lookup: { from: "pets", localField: "pet_id", foreignField: "pet_id", as: "pet" } },
      { $unwind: "$pet" },
      {
        $addFields: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $lte: ["$pet.age", 24] }, then: "Young" },  // 0–24 months
                { case: { $and: [{ $gt: ["$pet.age", 24] }, { $lte: ["$pet.age", 84] }] }, then: "Adult" } // 25–84 months
              ],
              default: "Senior"  // 85+ months
            }
          }
        }
      },
      { $group: { _id: "$ageGroup", count: { $sum: 1 } } },
      { $addFields: { sortOrder: { $switch: { branches: [
        { case: { $eq: ["$_id", "Young"] }, then: 1 },
        { case: { $eq: ["$_id", "Adult"] }, then: 2 },
        { case: { $eq: ["$_id", "Senior"] }, then: 3 }
      ], default: 4 } } } },
      { $sort: { sortOrder: 1 } }
    ]);

    const ageGroupLabels = ageGroupDataRaw.map(a => a._id);
    const ageGroupCounts = ageGroupDataRaw.map(a => a.count);

    /* =====================
       Vaccination Coverage
    ====================== */
    const vaccinationDataRaw = await MedicalRecord.aggregate([
      { $match: { type: 'Vaccination' } },
      { $group: { _id: '$vaccination_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const vaccinationLabels = vaccinationDataRaw.map(v => v._id);
    const vaccinationCounts = vaccinationDataRaw.map(v => v.count);

    /* =====================
       Common Diagnoses
    ====================== */
    const diagnosisDataRaw = await MedicalRecord.aggregate([
      { $match: { type: 'Check-up', diagnosis: { $exists: true } } },
      { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const diagnosisLabels = diagnosisDataRaw.map(d => d._id);
    const diagnosisCounts = diagnosisDataRaw.map(d => d.count);

    /* =====================
       Breed Popularity Chart
    ====================== */
    const breedBySpeciesRaw = await Adoption.aggregate([
        {
            $lookup: {
            from: "pets",
            localField: "pet_id",
            foreignField: "pet_id",
            as: "pet"
            }
        },
        { $unwind: "$pet" },
        {
            $group: {
            _id: {
                species: "$pet.species",
                breed: "$pet.breed"
            },
            count: { $sum: 1 }
            }
        },
        {
            $group: {
            _id: "$_id.species",
            breeds: {
                $push: {
                breed: "$_id.breed",
                count: "$count"
                }
            }
            }
        }
        ]);

    const breedBySpecies = {};
    breedBySpeciesRaw.forEach(s => {breedBySpecies[s._id] = s.breeds;});

    res.render('reports', {
        page: 'reports',
        totalPets, totalAdopters, totalAdoptions, successRate,
        topAdopters, speciesStats, monthlyDataByYear,
        ageGroupLabels, ageGroupCounts,
        vaccinationLabels, vaccinationCounts,
        diagnosisLabels, diagnosisCounts,
        speciesList, selectedSpecies, breedBySpecies
    });

  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
