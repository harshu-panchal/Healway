/**
 * Healway Application Theme Configuration
 * Updated based on Single Blue Color from Logo ('way' text)
 */

export const theme = {
    colors: {
        primary: {
            DEFAULT: '#0077C2', // Blue from 'way'
            dark: '#005a9e',    // Hover state
            light: '#3392ce',   // Gradient middle
            lighter: '#66addb', // Gradient End
            surface: 'rgba(0, 119, 194, 0.1)', // Light background
            border: 'rgba(0, 119, 194, 0.3)',  // Border color
        },
        secondary: {
            DEFAULT: '#005a9e', // Darker Blue
            blue: '#1976D2',
            lightBlue: '#3B82F6',
            indigo: '#6366f1',
        },
        status: {
            success: '#10B981', // Emerald 500
            warning: '#F59E0B', // Amber 500
            error: '#EF4444',   // Red 500
            info: '#3B82F6',    // Blue 500
        },
        text: {
            primary: '#0F172A',   // Slate 900
            secondary: '#475569', // Slate 600
            disabled: '#94A3B8',  // Slate 400
            white: '#FFFFFF',
        }
    },
    gradients: {
        header: 'linear-gradient(to right, #0077C2 0%, #3392ce 50%, #66addb 100%)', // Blue variations
    },
    typography: {
        fontFamily: 'Inter, sans-serif',
    }
}

export default theme;
