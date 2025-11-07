import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyAppointments = () => {

    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Robust date formatter supporting:
    // - underscore format: "7_11_2025" (D_M_YYYY)
    // - ISO format: "2025-11-07" (YYYY-MM-DD)
    // - full Date strings (fallback)
    const slotDateFormat = (slotDate) => {
        if (!slotDate) return ''

        // If underscore format: D_M_YYYY or DD_M_YYYY etc.
        if (slotDate.includes('_')) {
            const parts = slotDate.split('_')
            const d = parts[0]
            const m = Number(parts[1]) // month as number
            const y = parts[2]
            const monthName = months[m - 1] || ''
            return `${d} ${monthName} ${y}`
        }

        // If ISO-like format: YYYY-MM-DD
        if (slotDate.includes('-')) {
            const parts = slotDate.split('-')
            // defensive: ensure we have 3 parts and they are numeric-ish
            if (parts.length === 3) {
                const y = parts[0]
                const m = Number(parts[1])
                const d = Number(parts[2])
                const monthName = months[m - 1] || ''
                // remove leading zeros from day
                return `${d} ${monthName} ${y}`
            }
        }

        // Fallback: try Date parsing
        const dt = new Date(slotDate)
        if (!isNaN(dt.getTime())) {
            return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`
        }

        // Last fallback: return raw value
        return slotDate
    }

    // Safe address renderer: handles object or string
    const renderAddressLines = (address) => {
        if (!address) return [ '', '' ]
        // If address is a string, try splitting by newline or comma
        if (typeof address === 'string') {
            const parts = address.split('\n').map(p => p.trim()).filter(Boolean)
            return [ parts[0] || '', parts[1] || '' ]
        }
        // If address is an array (unlikely) use first two entries
        if (Array.isArray(address)) {
            return [address[0] || '', address[1] || '']
        }
        // Otherwise assume object with line1/line2
        return [ address.line1 || '', address.line2 || '' ]
    }

    // Getting User Appointments Data Using API
    const getUserAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            // defensive: ensure appointments array exists
            const appts = Array.isArray(data.appointments) ? data.appointments : []
            setAppointments(appts.reverse())
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to cancel appointment Using API
    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })

            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const initPay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {
                console.log(response)
                try {
                    const { data } = await axios.post(backendUrl + "/api/user/verifyRazorpay", response, { headers: { token } });
                    if (data.success) {
                        navigate('/my-appointments')
                        getUserAppointments()
                    }
                } catch (error) {
                    console.log(error)
                    toast.error(error.message)
                }
            }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    // Function to make payment using razorpay
    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-razorpay', { appointmentId }, { headers: { token } })
            if (data.success) {
                initPay(data.order)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to make payment using stripe
    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                const { session_url } = data
                window.location.replace(session_url)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    return (
        <div>
            <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>
            <div className=''>
                {appointments.map((item, index) => {
                    // defensive defaults for nested properties
                    const docData = item.docData || {}
                    const [addrLine1, addrLine2] = renderAddressLines(docData.address)
                    const queuePosition = (item.queuePosition !== undefined && item.queuePosition !== null) ? item.queuePosition : 1
                    const peopleAhead = (item.peopleAhead !== undefined && item.peopleAhead !== null) ? item.peopleAhead : 0
                    const totalInSlot = (item.totalInSlot !== undefined && item.totalInSlot !== null) ? item.totalInSlot : 1

                    return (
                        <div key={index} className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b'>
                            <div>
                                <img className='w-36 bg-[#EAEFFF]' src={docData.image || assets.doctor_placeholder} alt={docData.name || 'doctor'} />
                            </div>
                            <div className='flex-1 text-sm text-[#5E5E5E]'>
                                <p className='text-[#262626] text-base font-semibold'>{docData.name || '—'}</p>
                                <p>{docData.speciality || ''}</p>
                                <p className='text-[#464646] font-medium mt-1'>Address:</p>
                                <p className=''>{addrLine1}</p>
                                <p className=''>{addrLine2}</p>
                                <p className=' mt-1'>
                                    <span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} | {item.slotTime}
                                </p>

                                {/* Queue Position Information */}
                                {!item.cancelled && !item.isCompleted && (
                                    <div className='mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200'>
                                        <p className='text-sm font-semibold text-blue-900 mb-2'>Queue Information</p>
                                        <div className='flex gap-4 text-xs'>
                                            <div>
                                                <p className='text-gray-600'>Your Position:</p>
                                                <p className='font-bold text-blue-700 text-lg'>{queuePosition}</p>
                                            </div>
                                            <div>
                                                <p className='text-gray-600'>People Ahead:</p>
                                                <p className='font-bold text-orange-600 text-lg'>{peopleAhead}</p>
                                            </div>
                                            <div>
                                                <p className='text-gray-600'>Total in Slot:</p>
                                                <p className='font-bold text-green-600 text-lg'>{totalInSlot}/10</p>
                                            </div>
                                        </div>
                                        {peopleAhead > 0 && (
                                            <p className='mt-2 text-xs text-gray-600'>
                                                ⏱️ Please arrive on time. {peopleAhead} {peopleAhead === 1 ? 'person' : 'people'} will be seen before you.
                                            </p>
                                        )}
                                        {queuePosition === 1 && (
                                            <p className='mt-2 text-xs text-green-700 font-medium'>
                                                ✓ You're first in line for this slot!
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div></div>
                            <div className='flex flex-col gap-2 justify-end text-sm text-center'>
                                {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && <button onClick={() => setPayment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>}
                                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentStripe(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.stripe_logo} alt="" /></button>}
                                {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" /></button>}
                                {!item.cancelled && item.payment && !item.isCompleted && <button className='sm:min-w-48 py-2 border rounded text-[#696969]  bg-[#EAEFFF]'>Paid</button>}

                                {item.isCompleted && <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>Completed</button>}

                                {!item.cancelled && !item.isCompleted && <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>}
                                {item.cancelled && !item.isCompleted && <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default MyAppointments
