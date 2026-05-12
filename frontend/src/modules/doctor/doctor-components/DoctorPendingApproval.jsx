import React from 'react';
import { motion } from 'framer-motion';
import { IoTimeOutline, IoShieldCheckmarkOutline, IoDocumentTextOutline, IoCallOutline } from 'react-icons/io5';

const DoctorPendingApproval = ({ doctorName }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-primary to-primary-dark p-8 text-white relative overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl ring-1 ring-white/30">
              <IoTimeOutline className="text-4xl text-white animate-pulse" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Verification in Progress</h1>
            <p className="text-primary-surface/90 text-sm lg:text-base max-w-md">
              Hello Dr. {doctorName}, your professional account is currently being reviewed by our medical board.
            </p>
          </div>
        </div>

        <div className="p-8 lg:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                <IoDocumentTextOutline className="text-xl" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Documents</h3>
              <p className="text-[11px] text-slate-500">Checking credentials & medical license</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <IoShieldCheckmarkOutline className="text-xl" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Validation</h3>
              <p className="text-[11px] text-slate-500">Verifying clinic & practice details</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <IoShieldCheckmarkOutline className="text-xl" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Final Setup</h3>
              <p className="text-[11px] text-slate-500">Configuring your digital workspace</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl border border-blue-100 bg-blue-50/30">
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                <span className="text-xs font-bold">i</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">What happens next?</h4>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Once our team verifies your documents, you'll receive a real-time notification on this screen. Usually, this process takes 24-48 business hours.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs text-slate-500">Need urgent assistance?</p>
                <p className="text-sm font-bold text-slate-900">support@healway.com</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DoctorPendingApproval;
