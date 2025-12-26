import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary'
import stripe from "stripe";
// import razorpay from 'razorpay';
import { sendAppointmentConfirmation } from "../services/emailService.js";

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY)
// const razorpayInstance = new razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
// })

// Constants for queue management
const MAX_APPOINTMENTS_PER_SLOT = 5
const APPOINTMENT_DURATION_MINUTES = 12
const STAGGER_INTERVAL_MINUTES = 12

// API to register user
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to login user
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user profile data
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update user profile
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Helper function to validate booking date (within 30 days from today)
const isValidBookingDate = (slotDate) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const bookingDate = new Date(slotDate)
    bookingDate.setHours(0, 0, 0, 0)
    
    const thirtyDaysFromNow = new Date(today)
    thirtyDaysFromNow.setDate(today.getDate() + 30)
    
    return bookingDate >= today && bookingDate <= thirtyDaysFromNow
}

// Helper function to validate slot time (9 AM - 7 PM, 1-hour slots)
const isValidSlotTime = (slotTime) => {
    const validSlots = [
        "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
        "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
        "05:00 PM", "06:00 PM", "07:00 PM"
    ]
    return validSlots.includes(slotTime)
}

// Helper function to calculate estimated appointment time
const calculateEstimatedTime = (slotTime, position) => {
    // Parse slot time
    const [time, modifier] = slotTime.split(' ')
    let [hours, minutes] = time.split(':').map(Number)
    
    // Convert to 24-hour format
    if (modifier === 'PM' && hours !== 12) hours += 12
    if (modifier === 'AM' && hours === 12) hours = 0
    
    // Add stagger time based on position (position - 1) * interval
    const addMinutes = (position - 1) * APPOINTMENT_DURATION_MINUTES
    minutes += addMinutes
    hours += Math.floor(minutes / 60)
    minutes = minutes % 60
    
    // Format back to 12-hour format
    const estimatedModifier = hours >= 12 ? 'PM' : 'AM'
    const estimatedHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
    
    return `${estimatedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${estimatedModifier}`
}

// Helper function to calculate suggested arrival time (10 minutes before estimated time)
const calculateSuggestedArrival = (estimatedTime) => {
    const [time, modifier] = estimatedTime.split(' ')
    let [hours, minutes] = time.split(':').map(Number)
    
    // Convert to 24-hour format
    if (modifier === 'PM' && hours !== 12) hours += 12
    if (modifier === 'AM' && hours === 12) hours = 0
    
    // Subtract 10 minutes
    minutes -= 10
    if (minutes < 0) {
        minutes += 60
        hours -= 1
        if (hours < 0) hours = 23
    }
    
    // Format back to 12-hour format
    const arrivalModifier = hours >= 12 ? 'PM' : 'AM'
    const arrivalHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
    
    return `${arrivalHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${arrivalModifier}`
}

// API to book appointment 
const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime } = req.body

        // Validate booking date (within 30 days)
        if (!isValidBookingDate(slotDate)) {
            return res.json({ 
                success: false, 
                message: 'Appointments can only be booked within 30 days from today' 
            })
        }

        // Validate slot time (9 AM - 7 PM)
        if (!isValidSlotTime(slotTime)) {
            return res.json({ 
                success: false, 
                message: 'Invalid slot time. Please select a slot between 9:00 AM and 7:00 PM' 
            })
        }

        const docData = await doctorModel.findById(docId).select("-password")

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        let slots_booked = docData.slots_booked

        // Initialize date object if it doesn't exist
        if (!slots_booked[slotDate]) {
            slots_booked[slotDate] = {}
        }

        // Initialize slot array if it doesn't exist
        if (!slots_booked[slotDate][slotTime]) {
            slots_booked[slotDate][slotTime] = []
        }

        // Check if slot is full (max 5 people per slot)
        if (slots_booked[slotDate][slotTime].length >= MAX_APPOINTMENTS_PER_SLOT) {
            return res.json({ 
                success: false, 
                message: `Slot is full. Maximum ${MAX_APPOINTMENTS_PER_SLOT} appointments per slot.` 
            })
        }

        const userData = await userModel.findById(userId).select("-password")

        // Calculate position in queue (will be the next position)
        const queuePosition = slots_booked[slotDate][slotTime].length + 1

        // Calculate estimated appointment time and suggested arrival
        const estimatedTime = calculateEstimatedTime(slotTime, queuePosition)
        const suggestedArrival = calculateSuggestedArrival(estimatedTime)

        // Create appointment data
        const appointmentData = {
            userId,
            docId,
            userData,
            docData: {
                name: docData.name,
                image: docData.image,
                speciality: docData.speciality,
                degree: docData.degree,
                experience: docData.experience,
                about: docData.about,
                fees: docData.fees,
                address: docData.address,
                _id: docData._id
            },
            amount: docData.fees,
            slotTime,
            slotDate,
            estimatedTime,
            suggestedArrival,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // Add appointment ID to the slot (queue system)
        slots_booked[slotDate][slotTime].push(newAppointment._id.toString())

        // Save updated slots in doctor data
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        // Send confirmation email
        const emailData = {
            userData: {
                name: userData.name,
                email: userData.email
            },
            docData: {
                name: docData.name,
                address: docData.address
            },
            slotDate,
            slotTime,
            estimatedTime,
            suggestedArrival,
            queuePosition
        }

        // Send email asynchronously (don't wait for it to complete)
        sendAppointmentConfirmation(emailData).then(result => {
            if (result.success) {
                console.log(`✅ Confirmation email sent to ${userData.email}`);
            } else {
                console.log(`⚠️ Failed to send confirmation email: ${result.error}`);
            }
        }).catch(error => {
            console.log(`⚠️ Error sending confirmation email: ${error.message}`);
        });

        res.json({ 
            success: true, 
            message: 'Appointment Booked',
            queuePosition: queuePosition,
            totalInSlot: slots_booked[slotDate][slotTime].length,
            estimatedTime: estimatedTime,
            suggestedArrival: suggestedArrival
        })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {

        const { userId, appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        // verify appointment user 
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        // releasing doctor slot 
        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        // Remove appointment ID from the slot queue
        if (slots_booked[slotDate] && slots_booked[slotDate][slotTime]) {
            slots_booked[slotDate][slotTime] = slots_booked[slotDate][slotTime]
                .filter(id => id !== appointmentId.toString())
            
            // Clean up empty arrays/objects
            if (slots_booked[slotDate][slotTime].length === 0) {
                delete slots_booked[slotDate][slotTime]
            }
            
            if (Object.keys(slots_booked[slotDate]).length === 0) {
                delete slots_booked[slotDate]
            }
        }

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        // Calculate queue position for each appointment
        for (let appointment of appointments) {
            // Only calculate for non-cancelled appointments
            if (!appointment.cancelled) {
                try {
                    const doctor = await doctorModel.findById(appointment.docId)
                    
                    if (doctor && doctor.slots_booked[appointment.slotDate]) {
                        const slotBookings = doctor.slots_booked[appointment.slotDate][appointment.slotTime] || []
                        
                        // Find position of current appointment in the queue
                        const appointmentIdStr = appointment._id.toString()
                        const position = slotBookings.indexOf(appointmentIdStr)
                        
                        // Add queue information to appointment object
                        appointment._doc.queuePosition = position !== -1 ? position + 1 : 1
                        appointment._doc.peopleAhead = position !== -1 ? position : 0
                        appointment._doc.totalInSlot = slotBookings.length
                        
                        // Calculate estimated time if not already stored
                        if (!appointment.estimatedTime) {
                            appointment._doc.estimatedTime = calculateEstimatedTime(
                                appointment.slotTime, 
                                position !== -1 ? position + 1 : 1
                            )
                        }
                        
                        // Calculate suggested arrival if not already stored
                        if (!appointment.suggestedArrival) {
                            appointment._doc.suggestedArrival = calculateSuggestedArrival(
                                appointment._doc.estimatedTime || appointment.estimatedTime
                            )
                        }
                    } else {
                        // Default values if slot data not found
                        appointment._doc.queuePosition = 1
                        appointment._doc.peopleAhead = 0
                        appointment._doc.totalInSlot = 1
                        
                        if (!appointment.estimatedTime) {
                            appointment._doc.estimatedTime = appointment.slotTime
                        }
                        if (!appointment.suggestedArrival) {
                            appointment._doc.suggestedArrival = calculateSuggestedArrival(appointment.slotTime)
                        }
                    }
                } catch (err) {
                    console.log('Error calculating queue position:', err)
                    appointment._doc.queuePosition = 1
                    appointment._doc.peopleAhead = 0
                    appointment._doc.totalInSlot = 1
                    appointment._doc.estimatedTime = appointment.slotTime
                    appointment._doc.suggestedArrival = calculateSuggestedArrival(appointment.slotTime)
                }
            }
        }

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using razorpay
const paymentRazorpay = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        // creating options for razorpay payment
        const options = {
            amount: appointmentData.amount * 100,
            currency: process.env.CURRENCY,
            receipt: appointmentId,
        }

        // creation of an order
        const order = await razorpayInstance.orders.create(options)

        res.json({ success: true, order })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === 'paid') {
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt, { payment: true })
            res.json({ success: true, message: "Payment Successful" })
        }
        else {
            res.json({ success: false, message: 'Payment Failed' })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
    try {

        const { appointmentId } = req.body
        const { origin } = req.headers

        const appointmentData = await appointmentModel.findById(appointmentId)

        if (!appointmentData || appointmentData.cancelled) {
            return res.json({ success: false, message: 'Appointment Cancelled or not found' })
        }

        const currency = process.env.CURRENCY.toLocaleLowerCase()

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: "Appointment Fees"
                },
                unit_amount: appointmentData.amount * 100
            },
            quantity: 1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
            cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
            line_items: line_items,
            mode: 'payment',
        })

        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const verifyStripe = async (req, res) => {
    try {

        const { appointmentId, success } = req.body

        if (success === "true") {
            await appointmentModel.findByIdAndUpdate(appointmentId, { payment: true })
            return res.json({ success: true, message: 'Payment Successful' })
        }

        res.json({ success: false, message: 'Payment Failed' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to update patient status (on-my-way, arrived, etc.)
const updatePatientStatus = async (req, res) => {
    try {
        const { userId, appointmentId, status } = req.body

        // Validate status
        const validStatuses = ['waiting', 'on-my-way', 'arrived', 'in-consultation', 'completed']
        if (!validStatuses.includes(status)) {
            return res.json({ success: false, message: 'Invalid status' })
        }

        const appointmentData = await appointmentModel.findById(appointmentId)

        // Verify appointment belongs to user
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' })
        }

        // Update status
        await appointmentModel.findByIdAndUpdate(appointmentId, {
            patientStatus: status,
            statusUpdatedAt: new Date()
        })

        const statusMessages = {
            'on-my-way': 'Status updated: On my way',
            'arrived': 'Status updated: Arrived at clinic',
            'waiting': 'Status updated: Waiting'
        }

        res.json({ 
            success: true, 
            message: statusMessages[status] || 'Status updated successfully' 
        })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
    paymentStripe,
    verifyStripe,
    updatePatientStatus
}