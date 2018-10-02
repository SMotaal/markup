// prettier-ignore
{

/*
 * Author(s):
 * Leo Cheung
 */
//  Required packages
const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const passport = require('passport')

// Load configs
const keys = require('../configs/keys')

// Load validation modules
const validateProfileInput = require('../validations/profile/profile')
const validateExperienceInput = require('../validations/profile/experience')
const validateEducationInput = require('../validations/profile/education')

// Load user model
const Profile = require('../models/Profile')
const User = require('../models/User')

// User API health check
router.get('/test', async (req, res, next) => {
    const docs = { msg: 'Profile API online' }
    res.status(200).send(docs)
})


}
