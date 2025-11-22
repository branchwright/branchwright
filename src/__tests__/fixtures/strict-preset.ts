const preset = {
  rules: {
    descriptionLength: 'required',
    ticketId: ['required', { prefix: 'ABC-' }],
  },
};

export default preset;
