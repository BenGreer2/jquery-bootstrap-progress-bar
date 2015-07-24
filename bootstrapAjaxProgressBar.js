/**
 * Bootstrap Ajax Progress Bar is very similar to jQuery.ui.progressbar, and borrows many functions from it, while adding new functionality to update status by ajax requests and working with Boostrap's stylsheet. 
 * 
 * 
 * Using jQuery and Bootstrap and need a progress bar to update via ajax? Great!
 * 
 * 
*/
;(function ( $, window, document, undefined ) {
'use strict';

	$.widget( 'ui.bootstrapAjaxProgressBar' , {
		options: {
			/**
			* Maximum progress value
			* @type {number}
			*/
			max : 100,
			
			/**
			* Current progress value
			* @type {number}
			*/
			value : 0,
			
			/**
			* URL to perform GET requests on and expects to receive an object containing the status of the progressRequest
			* @type {[type]}
			*/
			progressRequestUrl : null,
			
			/**
			* Determines whether the current status is displayed in the progress bar. If false, it is hidden.
			* @type {Boolean}
			*/
			showStatus : true,
			
			/**
			* Determines whether the current step is displayed in the progress bar. If false, it is hidden.
			* @type {Boolean}
			*/
			showSteps : true,
			
			/**
			* Determines whether the current step as a percentage is displayed in the progress bar. If false, it is hidden.
			* @type {Boolean}
			*/
			showPercent : true,
			
			/**
			* Frequency of refresh in milliseconds. Default is to refresh every 1 second
			* @type {Number}
			*/
			refreshInterval : 1000,
			
			/**
			* Maximum number of times for request to update progress to fail in consession before complete() is invoked.
			* Falsy value means never
			* @type {Number}
			*/
			maxConsecutiveFailCount : 5,
			
			/**
			* Function used to retrieve the current progress value from the response object retrieved from progressRequestUrl
			* Default implementation uses response.value
			* @param  {Object} response Object retrieved from progressRequestUrl
			* @return {Number}          Integer value of the progress
			*/
			getValueFromResponse : function(response) {
				return parseInt(response.value);
			},
			
			/**
			* Function used to retrieve the max progress value from the response object retrieved from progressRequestUrl
			* Default implementation uses response.max
			* @param  {Object} response Object retrieved from progressRequestUrl
			* @return {Number}          Integer maximum value of the progress
			*/
			getMaxFromResponse : function(response) {
				return parseInt(response.max);
			},
			
			/**
			* Function used to retrieve the currest status from the response object retrieved from progressRequestUrl
			* Default implementaiton uses response.status
			* @param  {Object} response Object retrieved from progressRequestUrl
			* @return {String}          Status of the progress
			*/
			getStatusFromResponse : function(response) {
				return response.status;
			},
			
			/**
			* Function used to retrieve whether the process has stopped from the repsonse object retrieved from progressRequestUrl
			* Default implementation uses response.stopped 
			* @param  {Object} response Object retrieved from progressRequestUrl
			* @return {Boolean}          Whether the process has stopped
			*/
			getIsStoppedFromResponse : function(response) {
				return response.stopped === true;
			},
			
			/**
			* Function used to retrieve whether an error has occured from the response object retrieved from progressRequestUrl
			* Default implementation uses response.errorOccurred
			* @param  	{Object} 	response 	Object retrieved from progressRequestUrl
			* @return 	{Boolean}          		Whether the progress has errored
			*/
			getIsErroredFromResponse : function(response) {
				return (response.errorOccurred === true);
			},
			
			/**
			* Callback invoked when the progressBar value changes. 
			* Part of jQuery progressbar
			* @param 	{Object}  	event 	jQuery event triggering the invokation of change()
			* @param  	{Object} 	Object 	containing fields 'oldValue' and 'newValue'
			*/
			change: null,
			
			/**
			* Callback invoked when the progressBar is completed, when value >= max, or isErrored
			* Part of jQuery progressbar
			*/
			complete: null
    	},

		//from jquery progressbar
		/**
		 * Minimum value of the progress value
		 */ 
		min: 0,
		
		/*
		* The previous value of self.options.value
		*/
		oldValue: null,
		
//added in bootstrap progressbar
		/**
		 * Current number of sequential request failures
		 */ 
		failCount : 0,
		
		/**
		 * .progress container element
		 */ 
		progressContainerEl : null,
		
		/**
		 * .progress-bar element that has width matching % complete
		 */ 
		progressBarEl : null,
		
		/**
		 * .progress-status element displaying the status
		 */ 
		progressStatusEl : null,
		
		/**
		 * .curr-step element displaying the current step of the progress
		 */ 
		valueEl : null,
		
		/**
		 * .steps element displaying the maximum number of steps
		 */ 
		maxEl : null,  //element displaying maxinum value/the number of steps (.steps)

		/**
		 * .percent element displaying the percent complete as value out of max
		 */ 
		percentEl : null,
		
		/**
		 * JS interval object used to request updates. 
		 * Stored so it can be stopped later
		 */ 
		interval : null,

		_create: function() {
			if(!this.options.progressRequestUrl) {
				console.error("Bootstrap Ajax Progress Bar requires progressRequestUrl");
				this._destroy();
				return false;
			}
			
			this.oldValue = this.options.value = this._constrainedValue();
			
			//create elements
			this.progressBarEl = $('<div class="progress-bar text-center nowrap" role="progressbar" data-fail-count="0" aria-valuenow="0" aria-valuemin="0" aria-valuemax="0" style="width: 0%;"></div>').appendTo(this.element);
		
			this.progressStatusEl = $('<span class="progress-status"></span> ').appendTo(this.progressBarEl);
			this.progressBarEl.append('<span class="spacer"> </span>');
			
			this.progressStepsEl = $('<span class="progress-steps"></span> ').appendTo(this.progressBarEl);
			this.valueEl = $('<span class="curr-step">' + this.options.value + '</span>').appendTo(this.progressStepsEl);
			this.progressStepsEl.append('/');
			this.maxEl = $('<span class="steps">' + this.options.max + '</span></span>').appendTo(this.progressStepsEl);
			this.progressBarEl.append('<span class="spacer"> </span>');
			
			this.percentEl = $('<span class="percent">' + this._percentage() + '</span> ').appendTo(this.progressBarEl);
			
			this.progressBarEl.append('<span class="spacer"> </span>');
			
			
			//show and hide desired status displays
			if(!this.options.showSteps) {
				this.progressStepsEl.addClass('sr-only');
			}
			
			if(!this.options.showStatus) {
				this.progressStatusEl.addClass('sr-only');
			}
			
			if(!this.options.showPercent) {
				this.percentEl.addClass('sr-only');
			}

			//create interval
			var self = this;
			this.interval = setInterval(function() {
				self._refresh();
			}, this.options.refreshInterval);
			
			self._refresh();
			
			console.log('Created bootstrapProgressBar on element', this.element);
		},
		
		_destroy: function() {
			clearInterval(this.interval);
			this.progressBarEl.remove();
		},
		
		/**
		 * Get/Set the current progress value 
		 */
		value: function( newValue ) {
			if ( newValue === undefined ) {
				return this.options.value;
			}
			
			this.options.value = this._constrainedValue( newValue );
			this._refreshValue();
		},
		
		/**
		 * Contstrains newValue within rules of progress value.
		 * newValue must be a number between min and max
		 */
		_constrainedValue: function( newValue ) {
			if ( newValue === undefined ) {
				newValue = this.options.value;
			}
			
			// sanitize value
			if ( typeof newValue !== 'number' ) {
				newValue = 0;
			}
			
			return Math.min( this.max, Math.max( this.min, newValue ) );
		},
		
		_setOptions: function( options ) {
			// Ensure "value" option is set after other values (like max)
			var value = this.options.value;
			delete this.options.value;
			
			this._super( options );
			
			this.options.value = this._constrainedValue( value );
			this._refreshValue();
		},
		
		_setOption: function( key, value ) {
			if ( key === 'max' ) {
				// Don't allow a max less than min
				value = Math.max( this.min, value );
			}
			
			if ( key === 'disabled' ) {
				this.progressBarEl
					.toggleClass( 'ui-state-disabled', !!value )
					.attr( 'aria-disabled', value );
			}
			
			this._super( key, value );
		},
    
      /**
       * Refreshes the progressbar by retrieving status information via ajax request.
       */
    	_refresh : function() {
    		var self = this;
    
    		if(self.options.maxConsecutiveFailCount && self.failCount >= self.options.maxConsecutiveFailCount) {
    			console.log('Porgress has reached max consecutive fail count of ' + self.options.maxConsecutiveFailCount + '. Triggering complete');
    			self._trigger('complete');
    			return ;
    		}
    
    		$.ajax({
    			url : self.options.progressRequestUrl,
    			type : 'GET',
    			async : true,
    			cache : false, // This will force requested pages not to be cached by the browser
    			beforeSend : function() {
    				if(self.ajaxActionEl) {
    					self.ajaxActionEl.show();
    				}
    			},
    			success : function(data, responseStatus) {
    				console.log('Request to \'' + self.options.progressRequestUrl + '\' was successfull with status ' + responseStatus, data);
    
    				if (!data) { // data is null or empty
    					console.warn('Request for Progress failed with empty data');
    					self.failCount++;
    					data = {};
    				} else {
    					//reset consecutive fail count
    					self.failCount = 0;
    				}
    
    				//get values from the response data and set variables
    				var value = self.options.getValueFromResponse(data) || 0,
    					max = self.options.getMaxFromResponse(data),
    					status = self.options.getStatusFromResponse(data),
    					isStopped = self.options.getIsStoppedFromResponse(data) === true,
    					isErrored = self.options.getIsErroredFromResponse(data) === true;
    
    				if(max && self.options.max !== max) {
    					self.options.max = max;
    					self.maxEl.html(self.options.max);
    				}
    
    				if(status) {
    					self.status = status;
    					self.progressStatusEl.html(status);
    				} else {
    					self.status = null;
    				}
    
    				if(isStopped || isErrored) {
    					console.log('Progress stopped or errored, triggering complete. ');
    					self._trigger('complete');
    				} else {
    					//setting value with invoke _refresh()
    					self.value(value); 
    				}
    			},
    			error : function(xhr, ajaxOptions, thrownError) {
    				self.failCount++;
    				console.error('Request failed', thrownError);
    			},
    			complete : function() {
    				if(self.ajaxActionEl) {
    					self.ajaxActionEl.hide();
    				}
    			}
    		});
    	},
    
      /**
       * Calculates the percentage complete by using this.options.value, min, and this.options.max
       */
    	_percentage: function() {
    		return 100 * ( this.options.value - this.min ) / ( this.options.max - this.min );
    	},
    
    	_refreshValue: function() {
    		
    		console.debug('refreshValue() this.options.value=' + this.options.value);
    		
    		var value = this.options.value,
    			percentage = this._percentage(),
    			percentageStr = percentage.toFixed(0) + '%';
    
    		this.progressBarEl.width(percentageStr);
    		this.valueEl.html(value);
    		this.percentEl.html(percentageStr);
    
    		this.element.attr({
    			'aria-valuemax': this.options.max,
    			'aria-valuenow': value
    		});
    
    		if ( this.oldValue !== value ) {
    			this._trigger( 'change', null, {oldValue : this.oldValue,  newValue:  value});
    
    			this.oldValue = value;
    		}
    
    		if ( value > this.options.max ) { //complete when value > max. value == max is the last chunk
    			console.log('Value greater than max. Must be complete');
    			this._trigger( 'complete' );
    		}
    	},
    
        /**
        * Publicly accessible invoker for _setOption()
        * @param {String} name  The name of the option to be set
        * @param {String} value The new value for the option
        */
        setOption : function(name, value) {
            return this._setOption(name, value);
        }
    });

})( jQuery, window, document );
