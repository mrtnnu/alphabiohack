import type { CreateLocationData, UpdateLocationData } from "@/types";
import tzlookup from '@photostructure/tz-lookup';

import { prisma } from "@/lib/prisma";

// Función auxiliar para calcular distancia entre dos puntos
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Crear ubicación
export const createLocation = async (data: CreateLocationData) => {
  try {
    let timezone: string | undefined;
    if (data.lat !== undefined && data.lon !== undefined) {
      timezone = tzlookup(data.lat, data.lon);
    }
    const location = await prisma.location.create({
      data: {
        address: data.address,
        logo: data.logo,
        title: data.title,
        description: data.description,
        lat: data.lat,
        lon: data.lon,
        ...(timezone ? { timezone } : {}),
      },
      include: {
        businessHours: true,
        bookings: true,
      },
    });
    return location;
  } catch (error) {
    console.error("Error creating location:", error);
    throw error;
  }
};

// Obtener ubicación por ID
export const getLocationById = async (id: string) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        businessHours: true,
        bookings: {
          include: {
            therapist: true,
            patient: true,
          },
        },
      },
    });
    return location;
  } catch (error) {
    console.error("Error getting location by id:", error);
    throw error;
  }
};

// Obtener todas las ubicaciones
export const getAllLocations = async () => {
  try {
    const locations = await prisma.location.findMany({
      include: {
        businessHours: true,
        bookings: {
          include: {
            therapist: true,
            patient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return locations;
  } catch (error) {
    console.error("Error getting all locations:", error);
    throw error;
  }
};

// Buscar ubicaciones por título
export const searchLocationsByTitle = async (title: string) => {
  try {
    const locations = await prisma.location.findMany({
      where: {
        title: {
          contains: title,
          mode: "insensitive",
        },
      },
      include: {
        businessHours: true,
        bookings: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return locations;
  } catch (error) {
    console.error("Error searching locations by title:", error);
    throw error;
  }
};

// Buscar ubicaciones por dirección
export const searchLocationsByAddress = async (address: string) => {
  try {
    const locations = await prisma.location.findMany({
      where: {
        address: {
          contains: address,
          mode: "insensitive",
        },
      },
      include: {
        businessHours: true,
        bookings: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return locations;
  } catch (error) {
    console.error("Error searching locations by address:", error);
    throw error;
  }
};

// Buscar ubicaciones cercanas por coordenadas
export const findNearbyLocations = async (
  lat: number,
  lon: number,
  radiusKm: number = 10
) => {
  try {
    // Esta es una implementación básica. Para producción, considera usar PostGIS
    const locations = await prisma.location.findMany({
      where: {
        AND: [{ lat: { not: null } }, { lon: { not: null } }],
      },
      include: {
        businessHours: true,
        bookings: true,
      },
    });

    // Filtrar por distancia (implementación simple)
    const nearbyLocations = locations.filter((location) => {
      if (!location.lat || !location.lon) return false;

      const distance = calculateDistance(lat, lon, location.lat, location.lon);
      return distance <= radiusKm;
    });

    return nearbyLocations;
  } catch (error) {
    console.error("Error finding nearby locations:", error);
    throw error;
  }
};

// Actualizar ubicación
export const updateLocation = async (id: string, data: UpdateLocationData) => {
  try {
    let timezone: string | undefined;
    if (data.lat !== undefined && data.lon !== undefined) {
      timezone = tzlookup(data.lat, data.lon);
    }
    const location = await prisma.location.update({
      where: { id },
      data: {
        address: data.address,
        logo: data.logo,
        title: data.title,
        description: data.description,
        lat: data.lat,
        lon: data.lon,
        ...(timezone ? { timezone } : {}),
      },
      include: {
        businessHours: true,
        bookings: true,
      },
    });
    return location;
  } catch (error) {
    console.error("Error updating location:", error);
    throw error;
  }
};

// Eliminar ubicación
export const deleteLocation = async (id: string) => {
  try {
    // Borrado en cascada manual para cumplir con FKs (Bookings no tiene onDelete: Cascade)
    const result = await prisma.$transaction(async (tx) => {
      // 1) Eliminar bookings ligados a la ubicación
      await tx.booking.deleteMany({ where: { locationId: id } });

      // 2) Eliminar la ubicación
      //    BusinessHours, TimeSlots, DateOverrides y OverrideTimeSlots tienen onDelete: Cascade
      //    y se eliminarán automáticamente al borrar Location
      const deletedLocation = await tx.location.delete({ where: { id } });
      return deletedLocation;
    });
    return result;
  } catch (error) {
    console.error("Error deleting location:", error);
    throw error;
  }
};

// Obtener horarios de atención de una ubicación
export const getLocationBusinessHours = async (locationId: string) => {
  try {
    const businessHours = await prisma.businessHours.findMany({
      where: { locationId },
      orderBy: { dayOfWeek: "asc" },
    });
    return businessHours;
  } catch (error) {
    console.error("Error getting business hours:", error);
    throw error;
  }
};

// Obtener citas de una ubicación
export const getLocationBookings = async (locationId: string) => {
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
    console.error("Error getting location bookings:", error);
    throw error;
  }
};
