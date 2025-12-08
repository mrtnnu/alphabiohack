import type {
  BookingFormData,
  CreateBookingData,
  UpdateBookingData,
} from "@/types";
import { BookingStatus, BookingType, DaysOfWeek  } from "@prisma/client";
import { PST_TZ, combineDateAndTimeToUtc } from "@/lib/utils/timezone";

import { prisma } from "@/lib/prisma";

// Función para mapear BookingFormData a CreateBookingData
/**
 * Mapea los datos del formulario de reserva a la estructura de creación de cita.
 * Permite inyectar una zona horaria específica para combinar la fecha y la hora.
 * Si no se proporciona tz, se usa PST_TZ por defecto.
 */
export const mapBookingFormDataToCreateData = (
  formData: BookingFormData,
  tz: string = PST_TZ
): CreateBookingData => {
  // Validar que los campos requeridos no sean null
  if (!formData.selectedDate || !formData.locationId) {
    throw new Error("Missing required fields: selectedDate and locationId");
  }

  // Combinar fecha y hora usando la zona horaria proporcionada (por defecto PST)
  const bookingSchedule = combineDateAndTimeToUtc(
    formData.selectedDate,
    formData.selectedTime,
    tz
  );

  return {
    bookingType: formData.appointmentType,
    locationId: formData.locationId,
    specialtyId: formData.specialtyId || undefined,
    serviceId: formData.selectedServiceIds?.[0] || undefined,
    firstname: formData.basicInfo.firstName,
    lastname: formData.basicInfo.lastName,
    phone: formData.basicInfo.phone,
    email: formData.basicInfo.email,
    givenConsent: formData.basicInfo.givenConsent,
    therapistId: formData.therapistId || undefined,
    patientId: formData.patientId || undefined,
    bookingNotes: formData.basicInfo.bookingNotes,
    bookingSchedule: bookingSchedule,
    status: formData.status,
  };
};

// Crear cita desde el formulario del wizard
export const createBookingFromForm = async (formData: BookingFormData) => {
  try {
    // Obtener la zona horaria de la ubicación seleccionada. Si no existe, se usará PST_TZ por defecto.
    let timezone = PST_TZ;
    try {
      if (formData.locationId) {
        const location = await prisma.location.findUnique({
          where: { id: formData.locationId },
          select: { timezone: true },
        });
        timezone = location?.timezone ?? PST_TZ;
      }
    } catch (tzError) {
      // En caso de error al obtener la ubicación, mantener la zona horaria por defecto.
      console.error("Error fetching location timezone:", tzError);
    }
    const createData = mapBookingFormDataToCreateData(formData, timezone);
    return await createBooking(createData);
  } catch (error) {
    console.error("Error creating booking from form:", error);
    throw error;
  }
};

// Crear cita
export const createBooking = async (data: CreateBookingData) => {
  try {
    const booking = await prisma.booking.create({
      data: {
        bookingType: data.bookingType,
        locationId: data.locationId,
        specialtyId: data.specialtyId,
        serviceId: data.serviceId,
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        email: data.email,
        givenConsent: data.givenConsent,
        therapistId: data.therapistId,
        patientId: data.patientId,
        bookingNotes: data.bookingNotes,
        bookingSchedule: data.bookingSchedule,
        status: data.status || "Pending",
      },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
    });
    // Email/invitación se envía desde /api/bookings tras crear la cita

    return booking;
  } catch (error) {
    console.error("Error creating booking:", error);
    throw error;
  }
};

// Obtener cita por ID
export const getBookingById = async (id: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        // Incluir timezone para mostrar la hora correcta según la sede
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
    });
    return booking;
  } catch (error) {
    console.error("Error getting booking by id:", error);
    throw error;
  }
};

// Obtener todas las citas
export const getAllBookings = async () => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        // Incluir timezone en la ubicación para poder mostrar la hora local en el front-end
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting all bookings:", error);
    throw error;
  }
};

// Obtener citas por paciente
export const getBookingsByPatient = async (patientId: string) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { patientId },
      include: {
        // Incluir timezone en la ubicación para que el paciente vea la hora correcta
        location: true,
        therapist: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by patient:", error);
    throw error;
  }
};

// Obtener citas por terapeuta
export const getBookingsByTherapist = async (therapistId: string) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { therapistId },
      include: {
        // Seleccionar la ubicación completa para incluir timezone
        location: {
          select: {
            id: true,
            title: true,
            address: true,
            timezone: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        therapist: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        specialty: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            id: true,
            description: true,
            cost: true,
            duration: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by therapist:", error);
    throw error;
  }
};

// Obtener especialidades y servicios disponibles
export const getSpecialtiesAndServices = async () => {
  try {
    const specialties = await prisma.specialty.findMany({
      include: {
        services: {
          select: {
            id: true,
            description: true,
            cost: true,
            duration: true,
          },
        },
      },
    });
    return specialties;
  } catch (error) {
    console.error("Error getting specialties and services:", error);
    throw error;
  }
};

// Obtener citas por ubicación
export const getBookingsByLocation = async (locationId: string) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { locationId },
      include: {
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by location:", error);
    throw error;
  }
};

// Obtener citas por tipo
export const getBookingsByType = async (bookingType: BookingType) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { bookingType },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by type:", error);
    throw error;
  }
};

// Buscar citas por email
export const getBookingsByEmail = async (email: string) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { email },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by email:", error);
    throw error;
  }
};

// Buscar citas por teléfono
export const getBookingsByPhone = async (phone: string) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { phone },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by phone:", error);
    throw error;
  }
};

// Buscar citas por nombre
export const getBookingsByName = async (
  firstname: string,
  lastname: string
) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        firstname: {
          contains: firstname,
          mode: "insensitive",
        },
        lastname: {
          contains: lastname,
          mode: "insensitive",
        },
      },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by name:", error);
    throw error;
  }
};

// Obtener citas por rango de fechas
export const getBookingsByDateRange = async (
  startDate: Date,
  endDate: Date
) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by date range:", error);
    throw error;
  }
};

// Obtener citas recientes
export const getRecentBookings = async (limit: number = 10) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return bookings;
  } catch (error) {
    console.error("Error getting recent bookings:", error);
    throw error;
  }
};

// Obtener citas pendientes (sin terapeuta asignado)
export const getPendingBookings = async () => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { therapistId: null },
      include: {
        location: true,
        patient: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting pending bookings:", error);
    throw error;
  }
};

// Asignar terapeuta a una cita
export const assignTherapistToBooking = async (
  bookingId: string,
  therapistId: string
) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { therapistId },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
    });
    return booking;
  } catch (error) {
    console.error("Error assigning therapist:", error);
    throw error;
  }
};

// Actualizar cita
export const updateBooking = async (id: string, data: UpdateBookingData) => {
  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: {
        bookingType: data.bookingType,
        locationId: data.locationId,
        firstname: data.firstname,
        lastname: data.lastname,
        phone: data.phone,
        email: data.email,
        givenConsent: data.givenConsent,
        therapistId: data.therapistId,
        patientId: data.patientId,
        bookingNotes: data.bookingNotes,
        bookingSchedule: data.bookingSchedule,
        status: data.status,
      },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
    });
    return booking;
  } catch (error) {
    console.error("Error updating booking:", error);
    throw error;
  }
};

// Eliminar cita
export const deleteBooking = async (id: string) => {
  try {
    const booking = await prisma.booking.delete({
      where: { id },
    });
    return booking;
  } catch (error) {
    console.error("Error deleting booking:", error);
    throw error;
  }
};

// Eliminar citas por paciente
export const deleteBookingsByPatient = async (patientId: string) => {
  try {
    const result = await prisma.booking.deleteMany({
      where: { patientId },
    });
    return result;
  } catch (error) {
    console.error("Error deleting bookings by patient:", error);
    throw error;
  }
};

// Eliminar citas por terapeuta
export const deleteBookingsByTherapist = async (therapistId: string) => {
  try {
    const result = await prisma.booking.deleteMany({
      where: { therapistId },
    });
    return result;
  } catch (error) {
    console.error("Error deleting bookings by therapist:", error);
    throw error;
  }
};

// Eliminar citas por ubicación
export const deleteBookingsByLocation = async (locationId: string) => {
  try {
    const result = await prisma.booking.deleteMany({
      where: { locationId },
    });
    return result;
  } catch (error) {
    console.error("Error deleting bookings by location:", error);
    throw error;
  }
};

// Obtener estadísticas de citas
export const getBookingStats = async () => {
  try {
    const totalBookings = await prisma.booking.count();
    const bookingsByType = await prisma.booking.groupBy({
      by: ["bookingType"],
      _count: {
        bookingType: true,
      },
    });
    const pendingBookings = await prisma.booking.count({
      where: { therapistId: null },
    });
    const assignedBookings = await prisma.booking.count({
      where: { therapistId: { not: null } },
    });

    return {
      totalBookings,
      pendingBookings,
      assignedBookings,
      bookingsByType: bookingsByType.map((item) => ({
        type: item.bookingType,
        count: item._count.bookingType,
      })),
    };
  } catch (error) {
    console.error("Error getting booking stats:", error);
    throw error;
  }
};

// Obtener estadísticas por terapeuta
export const getBookingStatsByTherapist = async (therapistId: string) => {
  try {
    const totalBookings = await prisma.booking.count({
      where: { therapistId },
    });
    const bookingsByType = await prisma.booking.groupBy({
      by: ["bookingType"],
      where: { therapistId },
      _count: {
        bookingType: true,
      },
    });

    return {
      totalBookings,
      bookingsByType: bookingsByType.map((item) => ({
        type: item.bookingType,
        count: item._count.bookingType,
      })),
    };
  } catch (error) {
    console.error("Error getting booking stats by therapist:", error);
    throw error;
  }
};

// Obtener estadísticas por ubicación
export const getBookingStatsByLocation = async (locationId: string) => {
  try {
    const totalBookings = await prisma.booking.count({
      where: { locationId },
    });
    const bookingsByType = await prisma.booking.groupBy({
      by: ["bookingType"],
      where: { locationId },
      _count: {
        bookingType: true,
      },
    });

    return {
      totalBookings,
      bookingsByType: bookingsByType.map((item) => ({
        type: item.bookingType,
        count: item._count.bookingType,
      })),
    };
  } catch (error) {
    console.error("Error getting booking stats by location:", error);
    throw error;
  }
};

// Verificar disponibilidad de terapeuta
export const checkTherapistAvailability = async (
  therapistId: string,
  date: Date
) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.count({
      where: {
        therapistId,
        bookingSchedule: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return {
      isAvailable: bookings < 10, // Máximo 10 citas por día
      bookingsCount: bookings,
    };
  } catch (error) {
    console.error("Error checking therapist availability:", error);
    throw error;
  }
};

// Verificar disponibilidad de horario específico
export const checkTimeSlotAvailability = async (
  therapistId: string,
  bookingSchedule: Date
) => {
  try {
    const existingBooking = await prisma.booking.findFirst({
      where: {
        therapistId,
        bookingSchedule,
        status: {
          not: "Cancelled",
        },
      },
    });

    return {
      isAvailable: !existingBooking,
      existingBooking,
    };
  } catch (error) {
    console.error("Error checking time slot availability:", error);
    throw error;
  }
};

// Obtener citas por fecha específica
export const getBookingsByDate = async (date: Date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        bookingSchedule: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
      orderBy: { bookingSchedule: "asc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by date:", error);
    throw error;
  }
};

// Obtener citas por terapeuta y fecha
export const getBookingsByTherapistAndDate = async (
  therapistId: string,
  date: Date
) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        therapistId,
        bookingSchedule: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        location: true,
        patient: true,
      },
      orderBy: { bookingSchedule: "asc" },
    });
    return bookings;
  } catch (error) {
    console.error("Error getting bookings by therapist and date:", error);
    throw error;
  }
};

// Obtener horarios disponibles para un terapeuta en una fecha
export const getAvailableTimeSlots = async (
  therapistId: string,
  date: Date,
  locationId: string
) => {
  try {
    // Obtener horarios de atención de la ubicación
    const dayOfWeek: DaysOfWeek = date.toLocaleDateString("en-US", {
    weekday: "long",
  }) as DaysOfWeek;
    const businessHours = await prisma.businessHours.findFirst({
      where: {
        locationId,
        dayOfWeek,
        isActive: true,
      },
      include: {
        timeSlots: {
          where: {
            isActive: true,
          },
          orderBy: {
            startTime: "asc",
          },
        },
      },
    });

    if (
      !businessHours ||
      !businessHours.timeSlots ||
      businessHours.timeSlots.length === 0
    ) {
      return []; // No hay horarios de atención ese día
    }

    // Obtener citas existentes del terapeuta ese día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await prisma.booking.findMany({
      where: {
        therapistId,
        bookingSchedule: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "Cancelled",
        },
      },
      select: {
        bookingSchedule: true,
      },
    });

    const bookedTimes = existingBookings.map((b) => {
      const time = new Date(b.bookingSchedule);
      return `${time.getHours().toString().padStart(2, "0")}:${time
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    });

    // Generar horarios disponibles cada 30 minutos para cada time slot
    const availableSlots = [];

    // Convertir tiempo a minutos para facilitar cálculos
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}`;
    };

    // Procesar cada time slot
    for (const timeSlot of businessHours.timeSlots) {
      const startMinutes = timeToMinutes(timeSlot.startTime);
      const endMinutes = timeToMinutes(timeSlot.endTime);

      for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
        const timeSlotStr = minutesToTime(minutes);
        if (!bookedTimes.includes(timeSlotStr)) {
          // Crear DateTime completo para el slot
          const slotDateTime = new Date(date);
          slotDateTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
          availableSlots.push(slotDateTime);
        }
      }
    }

    return availableSlots;
  } catch (error) {
    console.error("Error getting available time slots:", error);
    throw error;
  }
};

// Cambiar estado de una cita
export const updateBookingStatus = async (
  bookingId: string,
  status: BookingStatus
) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        location: true,
        specialty: true,
        service: true,
        therapist: true,
        patient: true,
      },
    });
    return booking;
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};
