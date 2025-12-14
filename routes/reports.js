const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const Adoption = require('../models/AdoptionRecord');
const Adopter = require('../models/Adopter');

router.get('/', async (req, res) => {
    try {
        // Total counts
        const totalPets = await Pet.countDocuments();
        const totalAdopters = await Adopter.countDocuments();
        const totalAdoptions = await Adoption.countDocuments();

        // Top adopters (by number of adoptions)
        const topAdopters = await Adoption.aggregate([
            {
                $group: {
                    _id: "$adopter_id",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Populate adopter names
        const topAdoptersPopulated = await Promise.all(
            topAdopters.map(async adopterStat => {
                const adopter = await Adopter.findOne({ adopter_id: adopterStat._id });
                return {
                    name: adopter ? adopter.name : "Unknown",
                    count: adopterStat.count
                };
            })
        );

        // Most adopted species
        const speciesStats = await Adoption.aggregate([
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
                    _id: "$pet.species",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.render('reports', {
            totalPets,
            totalAdopters,
            totalAdoptions,
            topAdopters: topAdoptersPopulated,
            speciesStats
        });

    } catch (err) {
        console.error("Error fetching report data:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
