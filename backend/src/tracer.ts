import tracer from 'dd-trace';
tracer.init().use('fastify', {
  blocklist: ['/'], // ignore ELB health check from traces
  headers: ['cloudfront-viewer-country-name', 'cloudfront-viewer-address', 'cloudfront-is-desktop-viewer', ]
});
export default tracer;
