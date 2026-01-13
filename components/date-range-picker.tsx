"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return "Seleccionar fechas"
    if (!range.to) return range.from.toLocaleDateString("es-ES", { month: "short", day: "numeric" })
    return `${range.from.toLocaleDateString("es-ES", { month: "short", day: "numeric" })} - ${range.to.toLocaleDateString("es-ES", { month: "short", day: "numeric" })}`
  }

  const handleSelect = (range: DateRange | undefined) => {
    onChange(range)
    // Keep open to allow easier adjustments or if the user clicks 'from' then thinks about 'to'
    // if (range?.from && range?.to) {
    //   setIsOpen(false)
    // }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal bg-transparent"
          onClick={() => setIsOpen(!isOpen)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={handleSelect} numberOfMonths={2} initialFocus />
      </PopoverContent>
    </Popover>
  )
}
