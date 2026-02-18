import React from 'react';

const PageLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-4">
            <div className="relative">
                {/* Outer Ring */}
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>

                {/* Inner Pulsing Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/40 animate-pulse"></div>
            </div>

            <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading healing experience...</p>
        </div>
    );
};

export default PageLoader;
