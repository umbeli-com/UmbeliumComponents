import { useState } from 'react';

export interface CalendarEvent {
  id: string | number;
  title: string;
  date: Date;
  platform?: string;
  status?: 'scheduled' | 'draft' | 'published';
}

export interface CalendarBoardProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function CalendarBoard({ events, onEventClick, onDateClick }: CalendarBoardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === month && 
             eventDate.getFullYear() === year;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-board__day calendar-board__day--empty" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    days.push(
      <div 
        key={day} 
        className={`calendar-board__day ${isToday(day) ? 'calendar-board__day--today' : ''} ${dayEvents.length > 0 ? 'calendar-board__day--has-events' : ''}`}
        onClick={() => onDateClick?.(new Date(year, month, day))}
      >
        <span className="calendar-board__day-number">{day}</span>
        {dayEvents.length > 0 && (
          <div className="calendar-board__events">
            {dayEvents.slice(0, 2).map(event => (
              <div 
                key={event.id}
                className={`calendar-board__event calendar-board__event--${event.status || 'scheduled'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
              >
                <span className="calendar-board__event-title">{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <span className="calendar-board__more">+{dayEvents.length - 2}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="calendar-board">
      <div className="calendar-board__header">
        <button className="calendar-board__nav-btn" onClick={prevMonth}>←</button>
        <h3 className="calendar-board__title">{MONTHS[month]} {year}</h3>
        <button className="calendar-board__nav-btn" onClick={nextMonth}>→</button>
      </div>

      <div className="calendar-board__weekdays">
        {DAYS.map(day => (
          <div key={day} className="calendar-board__weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-board__grid">
        {days}
      </div>
    </div>
  );
}

export default CalendarBoard;
