const calculateRevenueSplit = (doctorProfile, totalBillAmount) => {
  let doctorShare = 0;
  let centerShare = 0;

  if (doctorProfile.revenueShareType === 'Percentage') {
    doctorShare = (totalBillAmount * doctorProfile.doctorShareValue) / 100;
  } else {
    // Fixed amount per patient
    doctorShare = doctorProfile.doctorShareValue;
  }

  centerShare = totalBillAmount - doctorShare;

  return { 
    doctorShare: Math.max(0, doctorShare), 
    centerShare: Math.max(0, centerShare) 
  };
};

module.exports = calculateRevenueSplit;