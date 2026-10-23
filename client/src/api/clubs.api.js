// Llamadas a la API del módulo clubs: información del club, configuración y deportes.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// data: { name, address, phone, email, accentColor, extraInfo, sports: [{ clubSportId, sportId, name, priceFee }] }
export const getClubInfo = () => axiosClient.get('/clubs/info').then((res) => res.data)

// data: { name, socialFee, delayFee, conflictMargin, address, phone, email, accentColor, extraInfo }
export const getClubSettings = () => axiosClient.get('/clubs/settings').then((res) => res.data)

// payload: lo mismo que devuelve getClubSettings, sin el nombre (no se edita)
export const updateClubSettings = (payload) => axiosClient.put('/clubs/settings', payload).then((res) => res.data)

// data: [{ sportId, name, clubSportId, isActive, priceFee }]
export const getClubSports = () => axiosClient.get('/clubs/sports').then((res) => res.data)

// payload: { isActive, priceFee }. data: el deporte actualizado
export const updateClubSport = (sportId, payload) => axiosClient.put(`/clubs/sports/${sportId}`, payload).then((res) => res.data)
