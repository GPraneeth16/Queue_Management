import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'

const Appointment = () => {

    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext)
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const [docInfo, setDocInfo] = useState(null)
    const [docSlots, setDocSlots] = useState([]) // array of arrays (each day -> slot objects)
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime] = useState('')

    const navigate = useNavigate()

    const fetchDocInfo = async () => {
        const doc = doctors.find((d) => d._id === docId)
        setDocInfo(doc || null)
    }

    // Robust helper: check both ISO (YYYY-MM-DD) and underscore (D_M_YYYY) keys
    const getBookedCountFor = (slots_booked = {}, dateObj, slotTime) => {
        // iso: 2025-11-07
        const year = dateObj.getFullYear()
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
        const day = dateObj.getDate().toString().padStart(2, '0')
        const isoKey = `${year}-${month}-${day}`

        // underscore: 7_11_2025 (note: not zero padded)
        const underscoreKey = `${dateObj.getDate()}_${dateObj.getMonth() + 1}_${dateObj.getFullYear()}`

        let bookedCount = 0
        if (slots_booked[isoKey] && slots_booked[isoKey][slotTime]) {
            bookedCount = slots_booked[isoKey][slotTime].length
        } else if (slots_booked[underscoreKey] && slots_booked[underscoreKey][slotTime]) {
            bookedCount = slots_booked[underscoreKey][slotTime].length
        }
        return bookedCount
    }

    // Generate available slots: 9 AM - 7 PM, 1-hour intervals, max 10 people per slot, 30 days booking window
    const getAvailableSolts = () => {
        setDocSlots([])

        if (!docInfo) return

        // Valid time slots (9 AM - 7 PM)
        const validSlots = [
            "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
            "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
            "05:00 PM", "06:00 PM", "07:00 PM"
        ]

        const today = new Date()

        const newDocSlots = []

        // Generate slots for next 30 days (i from 0 to 29)
        for (let i = 0; i < 30; i++) {
            const currentDate = new Date(today)
            currentDate.setDate(today.getDate() + i)
            currentDate.setHours(0, 0, 0, 0)

            const timeSlots = []

            for (let slotTimeVal of validSlots) {
                // get booked count using robust helper
                const bookedCount = getBookedCountFor(docInfo.slots_booked || {}, currentDate, slotTimeVal)
                const isSlotAvailable = bookedCount < 10

                // Only show slots for current day if time hasn't passed
                if (i === 0) {
                    const now = new Date()
                    const [timePart, modifier] = slotTimeVal.split(' ')
                    let [hours, minutes] = timePart.split(':')

                    hours = parseInt(hours, 10)
                    minutes = parseInt(minutes, 10)

                    if (modifier === 'PM' && hours !== 12) {
                        hours += 12
                    }
                    if (modifier === 'AM' && hours === 12) {
                        hours = 0
                    }

                    const slotDateTime = new Date(currentDate)
                    slotDateTime.setHours(hours, minutes, 0, 0)

                    if (slotDateTime <= now) {
                        // skip this slot (already passed)
                        continue
                    }
                }

                if (isSlotAvailable) {
                    timeSlots.push({
                        datetime: new Date(currentDate), // full date object
                        time: slotTimeVal,
                        available: 10 - bookedCount // remaining slots
                    })
                }
            }

            if (timeSlots.length > 0) {
                newDocSlots.push(timeSlots)
            }
        }

        setDocSlots(newDocSlots)
        // reset selected slot index/time if out of range
        if (slotIndex >= newDocSlots.length) {
            setSlotIndex(0)
            setSlotTime('')
        }
    }

    const bookAppointment = async () => {
        if (!token) {
            toast.warning('Login to book appointment')
            return navigate('/login')
        }

        if (!slotTime) {
            return toast.warning('Please select a time slot')
        }

        // guard: ensure slotIndex and docSlots exist
        if (!docSlots || !docSlots[slotIndex] || !docSlots[slotIndex][0]) {
            return toast.error('Selected slot date is invalid. Please reselect.')
        }

        const date = docSlots[slotIndex][0].datetime
        const day = date.getDate()
        const month = date.getMonth() + 1
        const year = date.getFullYear()

        // Format date as YYYY-MM-DD (ISO) to send to backend
        const slotDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/book-appointment',
                { docId, slotDate, slotTime },
                { headers: { token } }
            )

            if (data.success) {
                toast.success(data.message)

                // optimistic UI update: decrement available count for selected slot immediately
                setDocSlots(prev => {
                    const clone = prev.map(daySlots => daySlots.map(slot => ({ ...slot })))
                    // ensure slotIndex still valid
                    if (clone[slotIndex]) {
                        const found = clone[slotIndex].find(s => s.time === slotTime)
                        if (found) {
                            found.available = Math.max(0, found.available - 1)
                            // if available becomes 0, you may want to remove the slot or leave it (we'll leave it with 0 visible)
                        }
                    }
                    return clone
                })

                // refresh global doctors (keeps backend and other components in sync)
                await getDoctosData()

                // navigate to appointments after a short success message
                navigate('/my-appointments')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.message || error.message || 'Booking failed')
        }
    }

    // When global doctors array changes, update docInfo
    useEffect(() => {
        if (doctors && doctors.length > 0) {
            const updated = doctors.find(d => d._id === docId)
            setDocInfo(updated || null)
        }
    }, [doctors, docId])

    // When docInfo changes, (re)generate slots
    useEffect(() => {
        if (docInfo) {
            getAvailableSolts()
        } else {
            setDocSlots([])
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docInfo])

    // Initial load: set docInfo when component mounts and doctors are present
    useEffect(() => {
        if (doctors && doctors.length > 0) {
            fetchDocInfo()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctors, docId])

    return docInfo ? (
        <div>

            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
                </div>

                <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>

                    {/* ----- Doc Info : name, degree, experience ----- */}

                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{docInfo.name} <img className='w-5' src={assets.verified_icon} alt="" /></p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About <img className='w-3' src={assets.info_icon} alt="" /></p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>Appointment fee: <span className='text-gray-800'>{currencySymbol}{docInfo.fees}</span> </p>
                </div>
            </div>

            {/* Booking slots */}
            <div className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656]'>
                <p>Booking slots</p>
                <p className='text-sm text-gray-500 mt-1'>Available for the next 30 days • 9:00 AM - 7:00 PM • Max 10 people per slot</p>

                <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
                    {docSlots.length > 0 && docSlots.map((item, index) => (
                        <div
                            onClick={() => {
                                setSlotIndex(index)
                                setSlotTime('') // reset time selection when switching day
                            }}
                            key={index}
                            className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-[#DDDDDD]'}`}
                        >
                            <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                            <p>{item[0] && item[0].datetime.getDate()}</p>
                        </div>
                    ))}
                </div>

                <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
                    {docSlots.length > 0 && docSlots[slotIndex] && docSlots[slotIndex].map((item, index) => (
                        <div key={index} onClick={() => setSlotTime(item.time)} className='flex flex-col'>
                            <p className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime ? 'bg-primary text-white' : 'text-[#949494] border border-[#B4B4B4]'}`}>
                                {item.time.toLowerCase()}
                            </p>
                            <p className='text-xs text-gray-500 text-center mt-1'>
                                {item.available} slots left
                            </p>
                        </div>
                    ))}
                </div>

                <button onClick={bookAppointment} className='bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6'>Book an appointment</button>
            </div>

            {/* Listing Related Doctors */}
            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </div>
    ) : null
}

export default Appointment
