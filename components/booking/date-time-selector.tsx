"use client"

import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { PST_TZ, dateKeyInTZ, dayOfWeekInTZ } from "@/lib/utils/timezone"
import { useBusinessHours, useOverrides, useServices, useTherapistBookings } from "@/hooks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useFormatter, useNow, useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useBookingWizard } from "@/contexts"

export function DateTimeSelector() {
  const { data, update } = useBookingWizard()
  const { businessHours, loading: businessHoursLoading, error: businessHoursError } = useBusinessHours(data.locationId || undefined)
  const { services } = useServices(data.specialtyId || undefined)
  const { bookings: therapistBookings, loading: bookingsLoading, error: bookingsError } = useTherapistBookings()
  const { overrides } = useOverrides(data.locationId || undefined)
  const t = useTranslations('Booking')
  const format = useFormatter()
  const now = useNow()
  const [month, setMonth] = useState<Date>((data.selectedDate as Date) || (now as Date))

  // Estado para almacenar la disponibilidad de cada time slot
  const [slotAvailability, setSlotAvailability] = useState<Record<string, boolean>>({})

  // Zona horaria PST por requerimiento

  // Función para verificar si un slot de tiempo está ocupado usando comparación en PST
  const isTimeSlotBooked = useCallback((date: Date, timeSlot: string) => {
    if (!therapistBookings.length) {
      return false
    }
    
    // Fecha seleccionada en PST (YYYY-MM-DD)
    const selectedDateStr = dateKeyInTZ(date, PST_TZ)
    
    // Log de bookings existentes
    // const bookingsData = therapistBookings.map(booking => ({
    //   bookingSchedule: booking.bookingSchedule,
    //   date: booking.bookingSchedule ? new Date(booking.bookingSchedule).toISOString().split('T')[0] : null,
    //   time: booking.bookingSchedule ? new Date(booking.bookingSchedule).toISOString().split('T')[1].substring(0, 5) : null
    // }))
    
    
    // Verificar si hay algún booking que coincida con la fecha y hora
    const isBooked = therapistBookings.some(booking => {
      if (!booking || !booking.bookingSchedule) return false
      
      // Comparar componentes en PST
      const bookingDate = new Date(booking.bookingSchedule)
      const bookingDateStr = dateKeyInTZ(bookingDate, PST_TZ)
      const bookingTimeStr = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: PST_TZ }).format(bookingDate)
      
      // Comparación simple: mismo día y misma hora
      return bookingDateStr === selectedDateStr && bookingTimeStr === timeSlot
    })
    
    return isBooked
  }, [therapistBookings])

  // Función para verificar la disponibilidad de un time slot específico (simplificada)
  const checkSlotAvailability = useCallback((date: Date, timeSlot: string) => {
    if (!data.therapistId) return true // Si no hay therapistId, asumir disponible
    
    const slotKey = `${dateKeyInTZ(date, PST_TZ)}_${timeSlot}`
    
    // Si ya tenemos la disponibilidad cacheada, usarla
    if (slotAvailability[slotKey] !== undefined) {
      return slotAvailability[slotKey]
    }

    // Usar la función simple de comparación en lugar de llamar al backend
    const isBooked = isTimeSlotBooked(date, timeSlot)
    
    // Actualizar el cache
    setSlotAvailability(prev => ({
      ...prev,
      [slotKey]: !isBooked
    }))

    return !isBooked
  }, [data.therapistId, slotAvailability, isTimeSlotBooked])

  // Obtener la duración del servicio seleccionado
  // Esto determina tanto el intervalo entre slots como la duración mostrada al usuario
  const serviceDuration = useMemo(() => {
    if (!data.selectedServiceIds.length) {
      return 0
    }
    
    const selectedService = services.find(service => 
      data.selectedServiceIds.includes(service.id)
    )
    
    return selectedService?.duration || 0
  }, [data.selectedServiceIds, services])

  // Usar la duración del servicio como duración total (para compatibilidad con el resto del código)
  const totalDuration = serviceDuration

  // Obtener TODOS los slots de tiempo (disponibles y ocupados) basados en la nueva estructura de TimeSlots
  const allTimeSlots = useMemo(() => {
    if (!data.selectedDate || !businessHours.length || totalDuration === 0) {
      return []
    }

    const selectedDate = data.selectedDate // data.selectedDate ya es un Date
    const dayOfWeek = dayOfWeekInTZ(selectedDate, PST_TZ)
    // Si existe un override con timeSlots para este día, usar esos en lugar de businessHours
    // Comparación por clave de fecha en PST para evitar diferencias entre dispositivos
    const selectedKey = dateKeyInTZ(selectedDate, PST_TZ)
    const overrideForDay = overrides?.find(o => {
      const startKey = dateKeyInTZ(new Date(o.startDate), PST_TZ)
      const endKey = dateKeyInTZ(new Date(o.endDate), PST_TZ)
      return selectedKey >= startKey && selectedKey <= endKey
    })

    if (overrideForDay?.isClosed) return []

    const effectiveSlots = overrideForDay?.timeSlots?.length
      ? overrideForDay.timeSlots.map(s => ({ startTime: s.startTime, endTime: s.endTime, isActive: s.isActive ?? true }))
      : undefined

    const businessHour = businessHours.find(bh => bh.dayOfWeek === dayOfWeek && bh.isActive)
    
    const baseSlots = effectiveSlots ?? businessHour?.timeSlots
    if (!baseSlots || !baseSlots.length) return []

    // Convertir tiempo a minutos para facilitar cálculos
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(":").map(Number)
      return hours * 60 + minutes
    }
    
    const minutesToTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeString = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
      
      // Convertir a formato AM/PM en PST para mostrar
      const date = new Date()
      const dateInPst = new Date(date)
      dateInPst.setHours(hours, mins, 0, 0)
      return {
        value: timeString, // Valor para almacenar (formato 24h)
        display: format.dateTime(dateInPst, { 
          hour: 'numeric', 
          minute: 'numeric',
          timeZone: PST_TZ
        }) // Valor para mostrar (formato AM/PM)
      }
    }

    // Filtrar slots que pueden acomodar la duración total del servicio
    const validSlots = baseSlots.filter(slot => {
      if (!slot.isActive) return false
      
      const slotStartMinutes = timeToMinutes(slot.startTime)
      const slotEndMinutes = timeToMinutes(slot.endTime)
      const slotDuration = slotEndMinutes - slotStartMinutes
      
      // El slot debe tener suficiente duración para el servicio
      return slotDuration >= totalDuration
    })

    // Generar TODOS los slots (disponibles y ocupados) dentro de cada time slot configurado
    const allSlots: Array<{ value: string; display: string; isBooked: boolean }> = []
    
    validSlots.forEach(slot => {
      const slotStartMinutes = timeToMinutes(slot.startTime)
      const slotEndMinutes = timeToMinutes(slot.endTime)
      
      // Generar slots basados en la duración del servicio seleccionado
      // IMPORTANTE: El intervalo entre slots ahora se basa en la duración del servicio
      // Esto significa que si un servicio dura 60 minutos, los slots se generarán cada 60 minutos
      // Si un servicio dura 45 minutos, los slots se generarán cada 45 minutos
      const slotInterval = serviceDuration > 0 ? serviceDuration : 30 // Fallback a 30 min si no hay servicio
      
      for (let minutes = slotStartMinutes; minutes + totalDuration <= slotEndMinutes; minutes += slotInterval) {
        const timeSlot = minutesToTime(minutes)
        const isBooked = isTimeSlotBooked(selectedDate, timeSlot.value)
        
        allSlots.push({
          ...timeSlot,
          isBooked
        })
      }
    })
    
    return allSlots
  }, [data.selectedDate, businessHours, totalDuration, serviceDuration, format, isTimeSlotBooked, overrides])

  // Fechas marcadas por overrides (cerrados) para el calendario
  const bookedDates = useMemo(() => {
    if (!overrides || overrides.length === 0) return [] as Date[];
    const results: Date[] = [];
    const currentMonthKey = dateKeyInTZ(month, PST_TZ).slice(0, 7) // YYYY-MM
    for (const o of overrides) {
      if (!o.isClosed) continue;
      const start = new Date(o.startDate)
      const end = new Date(o.endDate)
      // Iterar por días usando la clave PST para no depender del tz del dispositivo
      const dayMs = 24 * 60 * 60 * 1000
      for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
        const d = new Date(t)
        const key = dateKeyInTZ(d, PST_TZ)
        if (key.slice(0, 7) === currentMonthKey) {
          // almacenar como Date para el calendario, usando la fecha construida desde la clave (evitar tz local)
          results.push(new Date(key + "T00:00:00Z"))
        }
      }
    }
    return results;
  }, [overrides, month])


  // Componente para renderizar cada time slot con verificación de disponibilidad
  const TimeSlotButton = ({ timeSlot, selectedDate }: { timeSlot: { value: string; display: string; isBooked: boolean }, selectedDate: Date }) => {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

    useEffect(() => {
      // Verificación síncrona inmediata
      if (timeSlot.isBooked) {
        setIsAvailable(false)
        return
      }

      const available = checkSlotAvailability(selectedDate, timeSlot.value)
      setIsAvailable(available)
    }, [timeSlot.value, timeSlot.isBooked, selectedDate])

    const isDisabled = timeSlot.isBooked || isAvailable === false

    return (
      <Button
        variant={data.selectedTime === timeSlot.value ? "default" : "outline"}
        onClick={() => !isDisabled && handleTimeSelect(timeSlot.value)}
        disabled={isDisabled}
        className={`w-full h-10 sm:h-12 transition-all duration-300 group ${
          isDisabled
            ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60 border-muted"
            : data.selectedTime === timeSlot.value 
              ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg scale-105 border-primary" 
              : "hover:bg-primary/80 hover:text-primary hover:border-primary/20 hover:scale-102 hover:shadow-md border-border/50"
        }`}
      >
        <Clock className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 transition-colors ${
          isDisabled
            ? "text-muted-foreground"
            : data.selectedTime === timeSlot.value 
              ? "text-primary-foreground hover:text-primary" 
              : "text-muted-foreground group-hover:text-foreground hover:text-primary"
        }`} />
        <span className="text-xs sm:text-sm font-medium">{timeSlot.display}</span>
        {isDisabled && (
          <span className="ml-1 text-xs opacity-75">🔒</span>
        )}
      </Button>
    )
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      update({ selectedDate: date })
    }
  }

  const handleTimeSelect = (time: string) => {
    update({ selectedTime: time })
  }

  const formatSelectedDate = (date: Date) => {
    return format.dateTime(date, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: PST_TZ
    })
  }

  // Verificar si una fecha está disponible (no es pasado y la clínica está abierta con slots activos), respetando overrides
  const isDateAvailable = (date: Date) => {
    // Comparar por clave PST para evitar variaciones por tz del dispositivo
    const todayKey = dateKeyInTZ(new Date(now), PST_TZ)
    const dateKey = dateKeyInTZ(date, PST_TZ)
    if (dateKey < todayKey) return false
    
    // Overrides: si existe un override para la fecha, priorizarlo
    if (overrides && overrides.length) {
      const overrideForDay = overrides.find(o => {
        const startKey = dateKeyInTZ(new Date(o.startDate), PST_TZ)
        const endKey = dateKeyInTZ(new Date(o.endDate), PST_TZ)
        return dateKey >= startKey && dateKey <= endKey
      })
      if (overrideForDay) {
        if (overrideForDay.isClosed) return false
        const hasActiveSlots = (overrideForDay.timeSlots || []).some(s => s.isActive !== false)
        if (hasActiveSlots) return true
      }
    }

    const dayOfWeek = dayOfWeekInTZ(date, PST_TZ)
    const businessHour = businessHours.find(bh => bh.dayOfWeek === dayOfWeek && bh.isActive)

    // Verificar que existe un business hour activo con slots de tiempo configurados
    return !!(businessHour && businessHour.timeSlots && businessHour.timeSlots.length > 0 && 
              businessHour.timeSlots.some(slot => slot.isActive))
  }

  if (businessHoursError || bookingsError) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4">
              <CalendarIcon className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-destructive">
              {t('error')}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              {businessHoursError || bookingsError}
            </p>
          </div>

          {/* Error Card */}
          <Card className="overflow-hidden shadow-2xl border-0">
            <CardContent className="p-8 sm:p-12">
              <div className="text-center space-y-6">
                <div className="p-6 rounded-2xl w-fit mx-auto">
                  <CalendarIcon className="h-12 w-12 text-destructive" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-destructive">{t('unableToLoadSchedule')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {t('troubleLoadingTimes')}
                  </p>
                </div>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline"
                  className="mt-6 h-12 px-8 text-sm font-medium border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
                >
                  {t('retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <main className="w-full max-w-7xl mx-auto" role="main">
      <div className="space-y-6">
        {/* Header Section */}
        <header className="text-center space-y-2" aria-labelledby="booking-date-time-heading">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <h2 id="booking-date-time-heading" className="text-2xl sm:text-3xl font-bold text-foreground">
            {t('selectDateTime')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            {t('chooseAppointmentTime')}
          </p>
        </header>

        {/* Main Content Card */}
        <Card className="overflow-hidden shadow-2xl border-0">

          <CardContent className="relative p-0 md:pr-48">
            {/* Calendar */}
            <section className="p-6" aria-label={t('selectDate')}>
              <Calendar
                key={month.toISOString()}
                mode="single"
                selected={data.selectedDate || undefined}
                onSelect={handleDateSelect}
                month={month}
                onMonthChange={setMonth}
                disabled={(date) => !isDateAvailable(date)}
                showOutsideDays={false}
                modifiers={{ booked: bookedDates }}
                modifiersClassNames={{ booked: "opacity-60 line-through" }}
                className="bg-transparent p-0 w-full"
                formatters={{
                  formatWeekdayName: (date) => {
                    return date.toLocaleString("en-US", { weekday: "short" })
                  },
                }}
              />
            </section>

            {/* Time Slots sidebar */}
            <aside className="no-scrollbar inset-y-0 right-0 flex max-h-72 w-full scroll-pb-6 flex-col gap-4 overflow-y-auto border-t p-6 md:absolute md:max-h-none md:w-48 md:border-t-0 md:border-l" aria-label={t('availableTimeSlots')}>
              <div className="grid gap-2">
                {data.selectedDate ? (
                  businessHoursLoading || bookingsLoading ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">{t('loading')}</div>
                  ) : allTimeSlots.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      {serviceDuration === 0 ? t('selectServicesToSeeTimes') : t('noSlotsAvailable')}
                    </div>
                  ) : (
                    allTimeSlots.map((timeSlot) => (
                      <TimeSlotButton
                        key={timeSlot.value}
                        timeSlot={timeSlot}
                        selectedDate={data.selectedDate!}
                      />
                    ))
                  )
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">{t('selectDateFirst')}</div>
                )}
              </div>
            </aside>
          </CardContent>

          <CardFooter className="border-t bg-gradient-to-r from-muted/5 via-background to-muted/5 p-2 overflow-x-hidden">
            <footer className="w-full space-y-3 sm:space-y-4" aria-label={t('appointmentSummary')}>
              {/* Appointment Summary */}
              <section>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1 sm:mb-2">{t('appointmentSummary')}</h4>
                    {data.selectedDate && data.selectedTime ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted/50">
                            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('date')}</p>
                            <p className="text-sm font-semibold text-foreground">{data.selectedDate ? formatSelectedDate(data.selectedDate) : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted/50">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{t('time')}</p>
                            <p className="text-sm font-semibold text-foreground">
                              {data.selectedTime ? format.dateTime(new Date(`2000-01-01T${data.selectedTime}`), {
                                hour: 'numeric',
                                minute: 'numeric',
                                timeZone: PST_TZ
                              }) : ''}
                            </p>
                          </div>
                        </div>
                        {data.selectedServiceIds.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-muted/50">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t('duration')}</p>
                              <p className="text-sm font-semibold text-foreground">
                                {serviceDuration || 0} {serviceDuration === 1 ? t('minute') : t('minutes', { count: serviceDuration || 0 })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <CalendarIcon className="h-4 w-4" />
                        </div>
                        <p className="text-sm">{t('selectDateAndTime')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </footer>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}